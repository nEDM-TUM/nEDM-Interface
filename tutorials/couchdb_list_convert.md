This list deals with the conversion of data from
[`slow_control_time(_label)`]{@tutorial couchdb_view_data} to csv format.

## [`_default/convert`](https://github.com/nEDM-TUM/nEDM-Interface/blob/master/_default_data/convert.json)

### `convert`

The function is very simple, taking the output of a view function and converting it to CSV:

```javascript
function(head, req) {
     var first = true;
     var start = 0;
     var end = 1;
     var pos_of_key = 0;
     function ConvertDateTime(arr) {
       if (first) {
         first = false;
         if (typeof arr[0] === "string") {
           start = 1;
           end = 0;
         } else {
           pos_of_key = arr.length-1;
         }
       }
       return [(new Date(Date.UTC.apply(this, arr.slice(start, arr.length-end)))).getTime()/1000,
                 arr[pos_of_key]];
     }
     var first_value = true;
     var isInteger;
     var listOfKeys;
     var el = '\\n';
     function HandleValue(val) {
       if (first_value) {
         if (typeof val === "number" || typeof val === "boolean") {
           isInteger = true;
         } else {
           isInteger = false;
           listOfKeys = Object.keys(val);
         }
         first_value = false;
       }
       if (isInteger) {
         return [["value", val]];
       } else {
         return listOfKeys.map( function(o) { return [o, val[o]];} );
       }
     }
     provides("csv", function() {
       var first_row = true;
       var row;
       var t, vals;
       function mapIt(x) {
         return function(o) { return o[x]; };
       }
       while((row = getRow())) {
         t = ConvertDateTime(row.key);
         vals = HandleValue(row.value);
         if (first_row) {
           // Output labels
           send((["Epoch time", "Variable"].concat(vals.map(mapIt(0)))).join(','));
           first_row = false;
         }
         send(el + ([t].concat(vals.map(mapIt(1)))).join(','));
       }
     });
}
```

### Example usage

<script src="https://gist.github.com/mgmarino/9a0b2393f097cb422ff9.js"></script>
