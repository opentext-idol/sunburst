/*
 * Copyright 2017 Hewlett Packard Enterprise Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    'underscore',
    'jquery',
    'd3'
], function(_, $, d3) {
    'use strict';

    function processOptionalFunction(optionProvided, defaultFunction) {
        return optionProvided === null
            ? null
            : _.isFunction(optionProvided)
                   ? optionProvided
                   : defaultFunction;
    }

    return function Sunburst(el, options) {
        var $container = $(el).css('position', 'relative');
        var sizeProp = options.sizeAttr || 'size';
        var nameProp = options.nameAttr || 'name';
        var partition = d3.layout.partition()
            .value(function(d) {
                return d[sizeProp];
            });

        this.resize = resize;
        this.redraw = redraw;
        var rawData = options.data;
        var arcData = partition.nodes(rawData);
        var inTransition = false;
        var animate = options.animate === true;

        function defaultLabelFormatter(d) {
            return _.escape(d[nameProp]);
        }

        var labelFormatter = processOptionalFunction(options.labelFormatter, defaultLabelFormatter);

        var clickCallback = options.clickCallback || _.noop;
        var hoverCallback = options.hoverCallback || _.noop;

        var outerRingAnimateSize = options.outerRingAnimateSize || 0;
        var strokeWidth = options.strokeWidth || '1px';
        var strokeColor = options.strokeColor || 'black';
        var comparator = options.comparator;

        function defaultKey(d) {
            // Generate unique key for 2nd tier sectors
            return (d.parent && d.parent.parent
                    ? d.parent[nameProp] + '/'
                    : '') +
                d[nameProp];
        }

        var key = processOptionalFunction(options.key, defaultKey);

        var containerWidth, containerHeight, radius, minRadius = 70;

        // Sunburst's centre should have no stroke -- looks strange when no data provided
        function strokeColorFn(d) {
            return d.parent
                ? strokeColor
                : 'none';
        }

        const defaultFillColorPalette = d3.scale.category20c();

        function defaultFillColorFn(d) {
            return defaultFillColorPalette((d.children ? d : d.parent)[nameProp]);
        }

        var fillColorFn = processOptionalFunction(options.fillColorFn, defaultFillColorFn);

        var x = d3.scale.linear().range([0, 2 * Math.PI]), y;

        resize();

        function setupSvgDimensions(svg) {
            svg.attr('width', containerWidth)
                .attr('height', containerHeight)
                .attr('viewBox', [-0.5 * containerWidth, -0.5 * containerHeight, containerWidth, containerHeight].join(' '))
        }

        function resize() {
            containerWidth = $container.width();
            containerHeight = $container.height();

            radius = 0.5 * Math.min(containerWidth, containerHeight) - outerRingAnimateSize;

            y = d3.scale.sqrt().range([0, radius]);

            if(svg) {
                setupSvgDimensions(svg);

                centerLabel();

                if(arcEls && arcEls.length) {
                    onClick(prevClicked || arcData[0]);
                }

                hideLabel();
            }
        }

        var svg = d3.select($container.get(0)).append('svg');
        setupSvgDimensions(svg);

        // calling sort with undefined is not the same as not calling it at all
        if(comparator) {
            partition.sort(comparator);
        }

        function createArc(hoverRadius) {
            return d3.svg.arc()
                .startAngle(function(d) {
                    return x(d.x);
                })
                .endAngle(function(d) {
                    return x(d.x + d.dx);
                })
                .innerRadius(function(d) {
                    return Math.max(0, y(d.y));
                })
                .outerRadius(function(d) {
                    return Math.max(0, y(d.y + d.dy)) + (hoverRadius || 0);
                });
        }

        var prevClicked, prevHovered;
        var arcEls = [];
        var arcElsJoin;
        var lastTransition;

        redraw(rawData, false, animate);

        function redraw(json, retainZoom, animate) {
            //TODO reimplement whole Sunburst fade-in using d3

            lastTransition && lastTransition.cancel();
            lastTransition = null;

            if(json) {
                rawData = json;
                arcData = partition.nodes(rawData);
            }

            if(retainZoom) {
                if(prevClicked) {
                    // should zoom onto the current el
                    x.domain([prevClicked.x, prevClicked.x + prevClicked.dx]);
                    y.domain([prevClicked.y, 1]).range([prevClicked.y ? minRadius : 0, radius]);
                }
            } else {
                x.domain([0, 1]);
                y.domain([0, 1]).range([0, radius]);
            }
            x.clamp();

            arcElsJoin = svg.datum(rawData)
                .selectAll('path')
                .data(arcData, key);

            arcElsJoin.enter()
                .append('path');

            arcEls = arcElsJoin
                .attr('d', createArc(0))
                .attr('fill', fillColorFn)
                .attr('stroke-width', strokeWidth)
                .attr('stroke', strokeColorFn)
                .on('click', function(d) {
                    d !== prevClicked && onClick(d);
                })
                .on('mouseover', mouseover)
                .on('mouseout', mouseout);

            arcElsJoin.exit()
                .remove();
        }

        hideLabel();

        function onClick(d) {
            clickCallback(d);

            if(animate) {
                prevClicked = d;
                inTransition = true;

                var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                    yd = d3.interpolate(y.domain(), [d.y, 1]),
                    yr = d3.interpolate(y.range(), [d.y ? minRadius : 0, radius]);
            }
        }

        var $label;

        function mouseover(d) {
            if(prevHovered === d) {
                return;
            }

            prevHovered = d;

            showLabel(d);

            if(!inTransition) {
                hoverCallback(d, createArc, outerRingAnimateSize, arcEls, arcData, svg);
            }
        }

        function mouseout(d) {
            prevHovered = null;

            hideLabel();

            if(!inTransition) {
                hoverCallback(d, createArc, 0, arcEls, arcData, svg);
            }
        }

        function showLabel(d) {
            if(labelFormatter) {
                var innerHTML = labelFormatter(d, prevClicked);

                if($label) {
                    $label.html(innerHTML);
                } else {
                    $label = $('<div>' + innerHTML + '</div>').css({
                        position: 'absolute',
                        'text-align': 'center',
                        'text-overflow': 'ellipsis',
                        'pointer-events': 'none',
                        color: 'black'
                    }).appendTo($container);
                }

                centerLabel();
            }
        }

        function hideLabel() {
            if($label) {
                $label.remove();
                $label = null;
            }
        }

        function centerLabel() {
            if($label) {
                $label.css({
                    left: 0.5 * (containerWidth - $label.width()),
                    top: 0.5 * (containerHeight - $label.height())
                });
            }
        }
    };
});
