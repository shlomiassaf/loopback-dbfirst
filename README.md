# loopback-dbfirst

A simple generator for database first approach in loopback 2.x

Manage transformation of database schema to Loopback LDL.
Basically a nice wrapper around `discoverModelDefinitions` & `discoverSchemas`.

This is a super beta, no testing.

## Quick Example

```javascript
var path = require('path');
var loopback = require('loopback');

var DbFirst = require('loopback-dbfirst');

var config = {
    baseModelConfigPath: path.resolve('../model-config-base.json'), // db wins, to persist base use modeMeta.skip = true
    modelConfigPath: path.resolve('../model-config.json'),
    dataSource: loopback.createDataSource('mysql', {
            "host": "localhost",
            "database": "sakila",
            "username": "root",
            "password": "XXXXXXX",
            "port": 3306
        }),
    dataSourceName: 'db',
    modelPublicDefault: function(name) { return name.length > 3;}, // public model only if more then 3 chars
    modelMeta: {
        'User': {skip: true},           // skipping so base definition is used.
        'AccessToken': {skip: true},    // skipping so base definition is used.
        'ACL': {skip: true},            // skipping so base definition is used.
        'RoleMapping': {skip: true},    // skipping so base definition is used.
        'Role': {skip: true},           // skipping so base definition is used.
        'City': {skipCustom: true}      // dont create custom logic files for City
    }
};

var migrate = new DbFirst(config);
migrate.automigrate(false);
```

###`modelConfigPath`: Path to model-config.json.

###`modelMeta` & `baseModelConfigPath`:
Database objects overwrite base model-config objects.
A base 'model-config.json' is used to provide basic models using the filename 'model-config-base.json'.
In this example, the database has matching tables for all models in the base model-config.
To prevent the overwrite we use a modelMeta for each model we have in the base model-config and skip the model processing.
The base model-config allows a user to define Built-In loopback models or fallback models.

The 'City' object is not in the base model config.
It is defined as a table in the database but we dont want to create an LDL file for it.  
Setting skipCustom to true will make sure it is created in 'model-config.json' but definition file creation is skipped.

####`modelMeta.skip`: The model is not declared (model-config.json) and not defined.
####`modelMeta.skipCustom`: The model is declared in model-config.json but not defined (no LDL and custom logic files).
 
###`modelPublicDefault` defines a function for handling api visibility.
Here we define that models with more then 3 characters are public, 3 or less are private.

model-config-base.json:
```javascript
{
    "User": {
        "dataSource": "db"
    },
    "AccessToken": {
        "dataSource": "db",
        "public": false
    },
    "ACL": {
        "dataSource": "db",
        "public": false
    },
    "RoleMapping": {
        "dataSource": "db",
        "public": false
    },
    "Role": {
        "dataSource": "db",
        "public": false
    }
}
```

TODO/Issues:
* A scenario where model-config.js is missing is not handled.
* Add option to save history (copy files to a backup location) when doing a migrate.

This repo is independent, it is`nt a part of loopback and/or strongloop.
 
