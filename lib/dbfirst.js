var fs = require('fs');
var util = require('util');
var path = require('path');
var async = require('async');

module.exports = Dbfirst;

/**
 *
 * @options {Object} config The options
 * @property {Object} dataSource Loopback datasource
 * @property {String} dataSourceName A datasource name.
 * @property {boolean|function} modelPublicDefault The default value for model api behavior.
 * It is possiable to set a function as a predicate func(modelName).
 * @property {function} modelLogicModule The default generated custom logic module, Optional.
 * It is possiable to set a function as that returns the module as a string. func(modelName, destPath).
 * The destPath can be used to use old files in the process, as they should be in destPath.
 * @property {object} modelMeta An object with model name a key and value
 * of model meta objects {skip: true, skipCustom: true} skip will not include the model in model-config,
 * skipCustom will include it in model-config but wont create a definition for it.
 * @constructor
 */
function Dbfirst(config){
    this.config = processOptions(config);
    loadModels.call(this);
}

function processOptions(config) {
    var output = {};
    output.baseModelConfigPath = config.baseModelConfigPath || undefined;
    output.modelConfigPath = config.modelConfigPath;
    output.dataSource = config.dataSource;
    output.dataSourceName = config.dataSourceName || config.dataSource.name;


    if (!config.modelPublicDefault) {
        output.isModelPublic = function() {return false;};
    }
    else if(typeof config.modelPublicDefault === 'function') {
        output.isModelPublic = config.modelPublicDefault;
    }
    else {
        output.isModelPublic = function() {return true;};
    }

    if (!config.modelLogicModule || !typeof config.modelLogicModule === 'function' ){
        output.moduleLogicGenerator = generateEmptyLogicModule;
    }
    else {
        output.moduleLogicGenerator = config.modelLogicModule;
    }

    output.modelMeta = {};
    if (config.modelMeta && typeof config.modelMeta === 'object') {
        var keys = Object.getOwnPropertyNames(config.modelMeta);
        for(var i=0; i<keys.length; i++){
            var o = config.modelMeta[keys[i]];
            if(typeof o === 'object' && (o.hasOwnProperty('skip') || o.hasOwnProperty('skipCustom'))){
                output.modelMeta[keys[i]] = o;
            }
        }
    }

    return output;
}

function generateEmptyLogicModule(name) {
    return util.format("module.exports = function(%s) {\n};", name);
}

function loadJsonObject(path){
    var data = fs.readFileSync(path, {encoding: 'utf-8'});
    return JSON.parse(data);
}

function saveJsonObject(path, modelConfig){
    fs.writeFileSync(path, JSON.stringify(modelConfig, null, 2), 'utf-8');
}

function loadModels() {
    this.models = {
        config: loadJsonObject(this.config.modelConfigPath),
        definitions: {},
        absSources: []
    };

    for(var i in this.models.config._meta.sources) {
        this.models.absSources.push(path.resolve(path.dirname(this.config.modelConfigPath), this.models.config._meta.sources[i]));
    }
}

function saveModels() {

    // Create base config models, if not exists.
    if (this.config.baseModelConfigPath && fs.existsSync(this.config.baseModelConfigPath)){
        var baseConfig = loadJsonObject(this.config.baseModelConfigPath);
        var keys = Object.getOwnPropertyNames(baseConfig);
        for (var i=0; i<keys.length; i++){
            if (! this.models.config.hasOwnProperty(keys[i])){
                this.models.config[keys[i]] = baseConfig[keys[i]];
            }
        }
    }
    saveJsonObject(this.config.modelConfigPath, this.models.config);

    Object.getOwnPropertyNames(this.models.definitions).forEach(function(key){
        saveJsonObject(path.join(this.models.absSources[0], key + '.json'), this.models.definitions[key]);

        var filePath = path.join(this.models.absSources[0], key + '.js');
        fs.writeFileSync(filePath, this.config.moduleLogicGenerator(key, filePath), 'utf-8');

    }.bind(this));
}

Dbfirst.prototype.automigrate = function(includeViews){
    deleteModels(this.config.dataSourceName, this.models);
    createModels.call(this);
    return;
}

Dbfirst.prototype.autoupdate = function(includeViews){
    createModels.call(this);
    return;
}

/**
 * Finds the model definition directory, if exists.
 * Searches for .json files only, no .js
 * @param locations
 * @param name
 * @returns {*}
 */
function findModelDir(locations, name){
    for(var i=0; i<locations.length; i++) {
       if (fs.existsSync(path.join(locations[i], name + '.json'))) {
           return locations[i];
       }
    };
    return undefined;
}

/**
 * Delete all models for a given dataSource
 * @param dataSourceName
 * @param modelConfig
 */
function deleteModels(dataSourceName, models){
    Object.getOwnPropertyNames(models.config).forEach(function(key) {
        if(models.config[key].dataSource == dataSourceName){
            delete models.config[key];
            delete models.definitions[key];

            //TODO: Move to function, add option to move to a directory instead of delete.
            var modelLocation = findModelDir(models.absSources, key);
            if (modelLocation) {
                fs.unlinkSync(path.join(modelLocation, key + '.json'));
                modelLocation = path.join(modelLocation, key + '.js');
                if (fs.existsSync(modelLocation)){
                    fs.unlinkSync(modelLocation);
                }
            }
        }
    });
}


function createModels(includeViews, cb){
    var self = this;

    var options = [
        {
            owner: self.config.dataSource.settings.database,
            views: includeViews
        }, {
            owner: self.config.dataSource.settings.database,
            relations: true
        }
    ];

    this.config.dataSource.discoverModelDefinitions(options[0], function(err, modelDef) {
        var q = async.queue(discoverSchemas.bind(self), 1)

        q.drain = function() {
            saveModels.call(self);
        }

        q.pause();

        for(var i in modelDef) {
            q.push({modelName: modelDef[i].name, options: options[1]}, function(err) {});
        }

        q.resume();
    });
}

function discoverSchemas(taskData, cb){
    var self = this;
    self.config.dataSource.discoverSchemas(taskData.modelName, taskData.options, function(err, schema) {
        Object.getOwnPropertyNames(schema).forEach(function(key) {
            var meta = self.config.modelMeta[schema[key].name] || {};
            if (!meta.skip) {
                setModelInConfig.call(self, schema[key], self.config.isModelPublic(schema[key].name));
                if (!meta.skipCustom) {
                    setModelCustomLogic.call(self, schema[key]);
                }
            }
        });
        cb();
    });
}

function setModelInConfig(schema, public){
    this.models.config[schema.name] = {
        "dataSource": this.config.dataSourceName,
        "public": public
    };
}

function setModelCustomLogic(schema) {
    schema.base = 'PersistedModel';
    this.models.definitions[schema.name] = schema;
}
