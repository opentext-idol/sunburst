/*
 * Copyright 2016 Hewlett-Packard Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */
require.config({
    baseUrl: '.',
    paths: {
        d3: 'bower_components/d3/d3',
        jquery: 'bower_components/jquery/jquery',
        Raphael: 'bower_components/raphael/raphael',
        underscore: 'bower_components/underscore/underscore'
    },
    shim: {
        d3: {
            exports: 'd3'
        }
    }
});
