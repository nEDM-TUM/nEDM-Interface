exports.page = function(doc, req) {
  new_query = {}
  for (var k in req.query) {
    new_query[k] = encodeURIComponent(req.query[k]).replace("%", "_");
  }
  html = "<html class='ui-mobile'><head><meta http-equiv='Content-Type' content='text/html; charset=UTF-8'><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'><title>nEDM Base</title> <link rel='stylesheet' href='/nedm_head/_design/nedm_head/css/nedm.css' /><script src='/nedm_head/_design/nedm_head/modules.js'></script><script src='/nedm_head/_design/nedm_head/scripts/nedm-base.js'></script><style> .center { text-align: center; } </style>" + doc.header + "</head>";

  html += "<body class='ui-mobile-viewport ui-overlay-c'>";
  html += doc.body;
  html += "</body></html>";
  return html;
};

exports.define_control = function(doc, req) {
  var template_func = function(obj) {
      var template = "<h3>" + obj.title + "</h3>" + obj.html;
      template += "<a href='#help" + obj._id + "' data-rel='popup'  data-role='button' class='ui-icon-alt'";
      template += "data-inline='true' data-transition='pop' data-icon='info' data-theme='e' data-iconpos='notext'>Help</a>";
      template += "<div data-role='popup' id='help" + obj._id + "'><p>" + obj.description + "</p></div>";
      return { json : { html: template, doc: obj } };
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
