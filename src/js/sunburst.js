/*
 * Copyright 2017 Open Text.
 *
 * Licensed under the MIT License (the "License"); you may not use this file
 * except in compliance with the License.
 *
 * The only warranties for products and services of Open Text and its affiliates
 * and licensors ("Open Text") are as may be set forth in the express warranty
 * statements accompanying such products and services. Nothing herein should be
 * construed as constituting an additional warranty. Open Text shall not be
 * liable for technical or editorial errors or omissions contained herein. The
 * information contained herein is subject to change without notice.
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
                    : '') + d[nameProp];
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
                .attr('viewBox', [-0.5 * containerWidth, -0.5 * containerHeight, containerWidth, containerHeight].join(' '));
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
        var join;
        var lastTransition;
        var finishedInitialTransition = false;

        redraw(rawData, false);

        function redraw(json, retainZoom) {
            //TODO reimplement whole Sunburst fade-in using d3

            // calling sort with undefined is not the same as not calling it at all
            if(comparator) {
                partition.sort(comparator);
            }

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

            if((finishedInitialTransition || !animate) && join) {
                join = join.data(arcData, key);

                if(animate) {
                    join
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .transition()
                        .duration(300)
                        .attrTween('d', function(d) {
                            this._current = this._current || _.pick(d, 'x', 'y', 'dx', 'dy');
                            const interpolate = d3.interpolate(
                                this._current,
                                _.pick(d, 'x', 'y', 'dx', 'dy')
                            );
                            this._current = interpolate(0);

                            return _.compose(createArc(0), interpolate);
                        });
                } else {
                    join
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .attr('d', createArc(0));
                }

                if(animate) {
                    join.enter()
                        .insert('path')
                        .style('opacity', 0)
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .transition()
                        .duration(300)
                        .style('opacity', 1)
                        .attrTween('d', function(d) {
                            this._current = _.pick(d, 'x', 'y', 'dx', 'dy');
                            const interpolate = d3.interpolate(
                                _.extend(_.pick(d, 'y', 'dy'), {x: d.x + d.dx, dx: 1.0e-6}),
                                this._current
                            );
                            this._current = interpolate(0);

                            return _.compose(createArc(0), interpolate);
                        });
                } else {
                    join.enter()
                        .insert('path')
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .attr('d', createArc(0));
                }

                if(animate) {
                    join.exit().transition()
                        .duration(300)
                        .style('opacity', 0)
                        .attrTween('d', function(d) {
                            const interpolate = d3.interpolate(
                                _.pick(d, 'x', 'y', 'dx', 'dy'),
                                _.extend(this._current, {x: d.x + d.dx, dx: 1.0e-6})
                            );

                            return _.compose(createArc(0), interpolate);
                        })
                        .remove();
                } else {
                    join.exit()
                        .remove();
                }
            } else {
                join = svg
                    .selectAll('path').data(arcData, key);

                if(animate) {
                    let n = 0;
                    finishedInitialTransition = false;
                    join.enter()
                        .append('path')
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .transition()
                        .duration(500)
                        .attrTween('d', function(d) {
                            this._current = _.pick(d, 'x', 'y', 'dx', 'dy');
                            const interpolate = d3.interpolate(
                                {x: 1.0e-6, dx: 1.0e-6},
                                this._current
                            );
                            this._current = interpolate(0);

                            return _.compose(createArc(0), interpolate);
                        })
                        .each(function() {
                            ++n;
                        })
                        .each('end', function() {
                            if(!--n) {
                                finishedInitialTransition = true
                            }
                        });
                } else {
                    join.enter()
                        .append('path')
                        .attr('fill', fillColorFn)
                        .attr('stroke-width', strokeWidth)
                        .attr('stroke', strokeColorFn)
                        .attr('d', createArc(0));
                }
            }

            join
                .on('click', function(d) {
                    d !== prevClicked && onClick(d);
                })
                .on('mouseover', mouseover)
                .on('mouseout', mouseout);
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
