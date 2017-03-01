/*
 * Copyright 2017 Hewlett Packard Enterprise Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    'd3'
], function(d3) {
    'use strict';

    // Class for animating things without a DOM element, e.g. Raphael
    return function Transition(duration, callback, transition) {
        var finished, ease = d3.ease(transition || 'cubic-in-out');

        d3.timer(function(elapsed) {
            if(finished) {
                return 1;
            }

            var t = elapsed > duration
                ? 1
                : elapsed / duration;
            callback(ease(t));

            if(t >= 1) {
                return 1;
            }
        });

        this.cancel = function() {
            finished = true;
        };
    };
});
