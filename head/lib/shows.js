exports.page = function(doc, req) {
  var handlebars = require('handlebars');
  new_query = {}
  for (var k in req.query) {
    new_query[k] = encodeURIComponent(req.query[k]).replace("%", "_");
  }
  html = handlebars.compile("<html class='ui-mobile'><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>nEDM Base</title> <link rel='stylesheet' href='/nedm_head/_design/nedm_head/css/nedm.css' /><script src='/nedm_head/_design/nedm_head/modules.js'></script><script src='/nedm_head/_design/nedm_head/scripts/nedm-base.js'></script><style> .center { text-align: center; } </style>{{{header}}}</head>")(doc);

  html += "<body class='ui-mobile-viewport ui-overlay-c'>";
  html += handlebars.compile(doc.body)(new_query);
  html += "</body></html>";
  return html;
};

exports.define_control = function(doc, req) {
  var handlebars = require('handlebars');
  var template_func = function(obj) {
      var template = "<h3>{{title}}</h3>{{{html}}}";
      template += "<a href='#help{{_id}}' data-rel='popup'  data-role='button' class='ui-icon-alt'";
      template += "data-inline='true' data-transition='pop' data-icon='info' data-theme='e' data-iconpos='notext'>Help</a>";
      template += "<div data-role='popup' id='help{{_id}}'><p>{{{description}}}</p></div>";
      return { json : { html: handlebars.compile(template)(obj), doc: obj } };
   };

   var obj = JSON.parse(req.body);
   if (doc != null) {
	 // We have a template sent in, and the doc object is the template
	 var arr = obj;
     var new_doc = {};
     for (var k in doc) {
         // Ignore special variables
         if (k[0] == "_") continue;
         new_doc[k] = doc[k];
     }
     for (var k in arr) {
         new_doc[k] = arr[k];
     }
     return template_func(new_doc);
  } else {
    return template_func(obj);
  }

};
