/*
 * Copyright 2017 Hewlett Packard Enterprise Development Company, L.P.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 */

define([
    'underscore',
    'jquery',
    'd3',
    'Raphael',
    './transition'
], function(_, $, d3, Raphael, Transition) {
    'use strict';

    function processOptionalFunction(optionProvided, defaultFunction) {
        return optionProvided === null
            ? null
            : _.isFunction(optionProvided)
                   ? optionProvided
                   : defaultFunction;
    }

    return function Sunburst(el, options) {
        this.resize = resize;
        this.redraw = redraw;
        var rawData = options.data;
        var inTransition = false;
        var animate = options.animate === true;
        var $container = $(el).css('position', 'relative');
        var sizeProp = options.sizeAttr || 'size';
        var nameProp = options.nameAttr || 'name';

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

        function resize() {
            containerWidth = $container.width();
            containerHeight = $container.height();

            radius = 0.5 * Math.min(containerWidth, containerHeight) - outerRingAnimateSize;

            y = d3.scale.sqrt().range([0, radius]);

            if(svg) {
                svg.setSize(containerWidth, containerHeight);
                svg.setViewBox(-0.5 * containerWidth, -0.5 * containerHeight, containerWidth, containerHeight);

                centerLabel();

                if(arcEls && arcEls.length) {
                    onClick(prevClicked || arcData[0]);
                }
                arcData.forEach(function(dataEl) {
                    svg.set(el).animate({path: createArc(outerRingAnimateSize)(dataEl)}, 100);
                });

                hideLabel();
            }
        }

        var svg = Raphael($container[0], containerWidth, containerHeight);
        svg.setViewBox(-0.5 * containerWidth, -0.5 * containerHeight, containerWidth, containerHeight);

        var partition = d3.layout.partition()
            .value(function(d) {
                return d[sizeProp];
            });

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
        var animationTime = 1000;
        var arcEls = [], arcData = [];
        var lastTransition;

        redraw(false, animate);

        function redraw(retainZoom, animate) {
            lastTransition && lastTransition.cancel();
            lastTransition = null;
            _.each(arcEls, function(arc) {
                arc.remove();
            });

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

            // on the existing elements
            arcEls = arcData.map(function(d, idx) {
                return svg.path(createArc(0)(d))
                    .attr('fill', fillColorFn(d))
                    .attr('stroke', strokeColorFn(d))
                .attr('stroke-width', strokeWidth)
                    .click(function() {
                        d !== prevClicked && onClick(arcData[idx]);
                    }).hover(function() {
                        mouseover(arcData[idx]);
                    }, function() {
                        mouseout(arcData[idx]);
                });
            });

            if(animate) {
                if(arcData.length < 200 && Raphael.svg) {
                    svg.set(arcEls).attr('opacity', 0).animate({opacity: 1}, animationTime);
                }
            }
        }

        hideLabel();

        function onTick(t, xd, yd, yr) {
            x.domain(xd(t));
            y.domain(yd(t)).range(yr(t));

            for(var ii = 0; ii < arcData.length; ++ii) {
                arcEls[ii].attr('path', createArc(0)(arcData[ii]));
            }

            if(t === 1) {
                inTransition = false;
            }
        }

        function onClick(d) {
            clickCallback(d);

            if(animate) {
                prevClicked = d;
                inTransition = true;

                var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
                    yd = d3.interpolate(y.domain(), [d.y, 1]),
                    yr = d3.interpolate(y.range(), [d.y ? minRadius : 0, radius]);

                if(Raphael.svg) {
                    lastTransition && lastTransition.cancel();
                    lastTransition = new Transition(animationTime, onTick);
                } else {
                    onTick(1);
                }
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
