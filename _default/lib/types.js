var Type = require('couchtypes/types').Type;
var fields = require('couchtypes/fields');

exports.execute = new Type('execute', {
    fields : {
                 command: fields.string(),
                 message: fields.string(),
                 timestamp : fields.string(),
                 created_by : fields.string()
             }
});

exports.data = new Type('data', {
    fields : {
                 value : fields.string(),
                 timestamp : fields.string(),
                 created_by : fields.string()
             }
});
