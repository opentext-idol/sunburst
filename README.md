# OpenText IDOL Sunburst

A JQuery plugin for displaying information in a topic map.

This repo uses git-flow. develop is the development branch. master is the last known good branch.

## Usage
    bower install hp-autonomy-sunburst
    
## Example
    
```js
// assumes sunburst is aliased to the library location in a require.config statement
requirejs(['sunburst/js/sunburst', 'd3', 'underscore'], function(Sunburst, d3, _) {
    let sunburst = new Sunburst(selector, {
        animate: false, // set to true to turn on animations
        clickCallback: _.noop, // function called on segment click
        comparator: d3.ascending, // d3 sort function - if undefined no sorting will be performed
        fillColorFn: function(d){}, // function for generating colors for d. Based on d3's category20c scale
        labelFormatter: function(d) {return _.escape(d[nameProp])}, // function for generating segment labels
        nameAttr: 'name', // attribute of each piece of data denoting the name
        sizeAttr: 'size', // attribute of each piece of data denoting the size
        strokeColor: 'black', // border color for segments
        strokeWidth: '1px', // border width for segments
        // data array for sunburst
        data: [{
            name: 'Segment 1',
            size: 3
        }, {
            name: 'Segment 2',
            size: 5
        }]
    });
    
    // resize the sunburst
    sunburst.resize();
    
    // redraw the sunburst with new data
    sunburst.redraw(data, false);
});
```

## Grunt tasks

* grunt test : Run the jasmine specs and print the results to the console
* grunt browser-test : Start a web server for running the jasmine specs in the browser
* grunt watch-test : Run the tests, and re-run the tests on file changes
* grunt lint : Run the JSHint checks and print the results to the console

## Is it any good?
Yes

## License

(c) Copyright 2016-2018 OpenText or one of its affiliates.

Licensed under the MIT License (the "License"); you may not use this project except in compliance with the License.
