var css = require('css');
var htmlparser = require('htmlparser2');
var fs = require('fs');

var rawHtml =  fs.readFileSync('example/test.html').toString();
var rawCss =  fs.readFileSync('example/test.css').toString();

var parsedCss = css.parse(rawCss);
var usedCss = {
  type: 'stylesheet',
  stylesheet: {
    rules: []
  }
};

var handler = new htmlparser.DomHandler(function (error, parsedHtml) {
  for(var j=0; j < parsedCss.stylesheet.rules.length; j++) {
    console.log(parsedCss.stylesheet.rules[j].selectors);
  }
  for(var i=0; i < parsedHtml.length; i++) {
    if(parsedHtml[i].type === 'tag') {
      visitTag(parsedHtml[i], []);
    }
  }
  console.log("used:");
  for(var k=0; k < usedCss.stylesheet.rules.length; k++) {
    console.log(usedCss.stylesheet.rules[k].selectors);
  }
});

//handle the node (check css)
function tagHandler(node, list) {
  console.log("visit tag " + node.name);
  for(var j=0; j < parsedCss.stylesheet.rules.length; j++) {
    var currentRule = parsedCss.stylesheet.rules[j];
    if(!currentRule.used) {
      for(var i=0; i < currentRule.selectors.length; i++) {
        if(isAppliable(currentRule.selectors[i], node, list)) {
          usedCss.stylesheet.rules.push(currentRule);
          //dont check that rule again
          currentRule.used = true;
          break;
        }
      }
    }
  }
}

//traverse all nodes
function visitTag(node, list) {
  tagHandler(node, list);
  var childList = list.slice(0);
  childList.push(node);
  for(var i = 0; i < node.children.length; i++) {
    var childNode = node.children[i];
    if(node.children[i].type === 'tag') {
      visitTag(childNode, childList);
    }
  }
}

//checks whether a rule is valid for a given node
function isAppliable(selector, node, parents) {
  var selectors = selector.split(" ");
  //cut off classes and stuff (only tag-names are important)
  for(var i = 0; i < selectors.length; i++) {
    selectors[i] = selectors[i].split(".")[0];
  }
  if(selectors[selectors.length - 1] !== node.name) {
    return false;
  }
  selectors.pop();
  selectors.reverse();
  var chainIsCorrect = true;
  for(var k = 0; k < parents.length; k++) {
    if(selectors[0] === parents[k].name) {
      selectors.shift();
    }
  }
  return selectors.length === 0;
}

//start parsing
var parser = new htmlparser.Parser(handler);
parser.write(rawHtml);
parser.done();
