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
            "password": "Br4tbr4t",
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

A base 'model-config.json' is used to provide basic models, filename 'model-config-base.json'.
The database contains the models in the base model-config so they must be skipped.
This means that database objects will overwrite base model-config objects.
The idea is to allow a model fallback.

The 'City' object is not skipped, it will be created in 'model-config.json' but definition file creation is skipped.

Models with more then 3 characters are public.

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
 
