/*
 *  Copyright 2016-2017 Hewlett Packard Enterprise Development Company, L.P.
 *  Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    '../../src/js/sunburst'
], function(Sunburst) {
    'use strict';

    describe('Sunburst', function() {
        it('exposes a constructor function', function() {
            expect(typeof Sunburst).toBe('function');
        });
    });
});
