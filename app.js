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
      visitTag(parsedHtml[i]);
    }
  }
  console.log("used:");
  for(var k=0; k < usedCss.stylesheet.rules.length; k++) {
    console.log(usedCss.stylesheet.rules[k].selectors);
  }
});

//handle the node (check css)
function tagHandler(node) {
  for(var j=0; j < parsedCss.stylesheet.rules.length; j++) {
    var currentRule = parsedCss.stylesheet.rules[j];
    if(currentRule.selectors && !currentRule.used) {
      for(var i=0; i < currentRule.selectors.length; i++) {
        if(isAppliable(currentRule.selectors[i], node)) {
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
function visitTag(node) {
  tagHandler(node);
  for(var i = 0; i < node.children.length; i++) {
    var childNode = node.children[i];
    if(node.children[i].type === 'tag') {
      visitTag(childNode);
    }
  }
}

//checks whether a rule is valid for a given node
function isAppliable(selector, node) {
  var selectors = parseSelector(selector);
  if(!selectorPartMatches(selectors[selectors.length - 1], node)) {
    //last tag name must match
    return false;
  }
  //remove last tag name (target node itself)
  selectors.pop();
  //reverse direction (start with the most specific)
  selectors.reverse();
  
  var currentNode = node;
  while(currentNode.parent && selectors.length > 0) {
    currentNode = currentNode.parent;
    if(selectorPartMatches(selectors[0], currentNode)) {
      selectors.shift();
    } else if(selectors[0].tag === '>') {
      //remove >-operator
      selectors.shift();
      //check whether next tag in pipe matches
      if(selectorPartMatches(selectors[0], currentNode)) {
        //if yes, remove it
        selectors.shift();
      } else {
        //else operator is not fullfilled
        return false;
      }
    }
  }
  return selectors.length === 0;
}

function selectorPartMatches(selectorPart, node) {
  var tagMatches = (selectorPart.tag === '*'  || selectorPart.tag === node.name);
  var classMatches = true;
  //check classes only if selectorpart contains classes
  if(selectorPart.classes.length > 0) {
    if(node.attribs.class) {
      var nodeClasses = node.attribs.class.split(' ');
      //check if all classes in the selectorpart are available in the node
      for(var i = 0; i < selectorPart.classes.length; i++) {
        if(nodeClasses.indexOf(selectorPart.classes[i]) === -1) {
          classMatches = false;
        }
      }
    } else {
      //there are classes in the selector-part but no classes in the node
      classMatches = false;
    }
  }
  return tagMatches && classMatches;
}

function parseSelector(selector) {
  var selectors = selector.split(' ');
  //cut off classes and stuff (only tag-names are important)
  for(var i = 0; i < selectors.length; i++) {
    var splittedByDot = selectors[i].split('.');
    selectors[i] = {
      tag: (splittedByDot[0] === '' ? '*' : splittedByDot[0]),
      classes: splittedByDot.slice(1)
    };
  }
  return selectors;
}

//start parsing
var parser = new htmlparser.Parser(handler);
parser.write(rawHtml);
parser.done();
