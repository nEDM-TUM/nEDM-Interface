var Type = require('couchtypes/types').Type;
var fields = require('couchtypes/fields');

exports.execute = new Type('execute', {
    fields : {
                 command: fields.string(),
                 message: fields.string(),
                 timestamp : fields.createdTime()
             }
});

exports.data = new Type('data', {
    fields : {
                 name: fields.string(),
                 value: fields.number(),
                 timestamp : fields.createdTime()
             }
});
