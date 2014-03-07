exports.page = function(doc, req) {
  var handlebars = require('handlebars');
  new_query = {}
  for (var k in req.query) {
    new_query[k] = encodeURIComponent(req.query[k]).replace("%", "_");
  }
  html = handlebars.compile("<html class='ui-mobile'><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>nEDM Base</title> <link rel='stylesheet' href='/nedm_head/_design/nedm_head/style/jquery.mobile-1.4.0-pre.css' /><script src='/nedm_head/_design/nedm_head/modules.js'></script><script src='/nedm_head/_design/nedm_head/scripts/nedm-base.js'></script><style> .center { text-align: center; } </style>{{{header}}}</head>")(doc);

  html += "<body class='ui-mobile-viewport ui-overlay-c'>";
  html += handlebars.compile(doc.body)(new_query);
  html += "</body></html>";
  return html; 
};

exports.define_control = function(doc, req) {
  var handlebars = require('handlebars');
  var template_func = function(obj) {
      var template = "<div label='div_{{_id}}'><h3>{{title}}</h3>{{{html}}}";
      template += "<a href='#help{{_id}}' data-rel='popup'  data-role='button' class='ui-icon-alt'";
      template += "data-inline='true' data-transition='pop' data-icon='info' data-theme='e' data-iconpos='notext'>Help</a>";
      template += "<div data-role='popup' id='help{{_id}}'><p>{{{description}}}</p></div><script>{{{script}}}";
      if ('pageevents' in obj) {
          var pe = obj['pageevents'];
          for (var ev in pe) {
              template += handlebars.compile("$('#{{db_control}}').on('{{ev}}', {{{func}}});")({ ev : ev, func : pe[ev]});
          }
      }
      template += '</script></div>';
      return handlebars.compile(template)(obj);
   };

   var obj = JSON.parse(req.query.doc);
   if (doc != null) {
     // We have a template sent in
     var arr = obj;
     new_doc = {} 
     for (var k in doc) {
         // Ignore special variables
         if (k[0] == "_") continue; 
         if (typeof doc[k] == 'object') {
             new_doc[k] = {};
             for (var j in doc[k]) {
                 new_doc[k][j] = handlebars.compile(doc[k][j])(arr); 
             }
         } else {
             new_doc[k] = handlebars.compile(doc[k])(arr); 
         }
     }
     new_doc._id = arr._id;
     return template_func(new_doc);
  } else {
    return template_func(obj); 
  }

};
