
// Hammer.defaults.behavior.touchAction = 'pan-y';

$.browser = {};

/*

The MIT License (MIT)

Copyright (c) 2017 Marcin Krawiec

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

https://github.com/marcinkrawiec/carousel

*/

// fixed init
+function ($) {

    var Carousel = function(container, options) {
        var defaults = {
            
            'carouselDebug' : false,
            'carouselNamespace' : 'carousel',
            'allowLoop' : false,
            'useSwipe' : false,
            'snapPositions': true,
            'snapPositionsBy': 1,
            'fitNoItemsByContainer': 1,
            'calculateImgDimensions' : true,
            'calculateItemDimensions' : false,
            'calculateContainerOffset': false,
            'moveToCenter': false,
            'generateNavItems': false,
            'minHeight': 0,
            'getOtherElementsDimensions': function(){ return 0; },
            'slideChanged': null,
            'selectorContainer': '.carousel__container',
            'selectorContent': '.carousel__content',
            'selectorItem': '.carousel-item',
            'selectorWidthItem': '.js-carousel-item-width',
            'selectorWidthContainer': '.js-carousel-container',
            'selectorWidthSpecialContainer': '',
            'selectorNavItemsContainer': '.carousel__nav',
            'selectorNavItems': '.carousel__nav-item'
        };
        
        var $container = $(container);
        this.$container = $(container);

        this.options = $.extend({}, defaults, options, $container.data());

        // console.log(this.options.carouselNamespace);

        this.$containerInner = $container.find(this.options.selectorContainer);
        this.$content = $container.find(this.options.selectorContent);
//      console.log(this.options.selectorItem);
        this.$items = $container.find(this.options.selectorItem);
        // this.$items.fadeTo(1, 0.01);
        // this.$items.fadeTo(250, 1);
        this.$itemsA = this.$items.find('> a, img');
        this.itemsMaxLeftPosition = 0;
        this.itemsCurrentPxPosition = 0;

        this.$navCheck = $container.find('[data-slide-href-target]');

        this.$navContainer = $container.find('.carousel-nav__progress');
        this.$nav = $container.find('.carousel-nav__indicator');
        this.$navItemsContainer = $container.find(this.options.selectorNavItemsContainer);
        this.$navItems = $container.find(this.options.selectorNavItems);
        this.$navNext = $container.find('.carousel-nav__item-right');
        this.$navPrev = $container.find('.carousel-nav__item-left');

        this.$navCurrentPage = $container.find('.carousel-nav__current-page');
        this.$navTotalPages = $container.find('.carousel-nav__total-pages');

        this.$navCurrentPage.text( 1 );
        this.$navTotalPages.text( Math.ceil(this.$items.size() / this.options.snapPositionsBy) );


        // todo: odnalezc totalPages
        // przypisac currentPage i totalPages
        this.navMaxLeftPosition = 0;
        this.navCurrentPxPosition = 0;

        this.currentPosition = 0;
        this.itemWidth = 0;

        this.doRedraw = true;
        this.hasChanged = true;

        this.isPanActive = false;
        this.isPanActiveLink = true;
        this.panStartOffset = 0;
        this.panLastOffset = 0;
        this.panVelocity = 0;

        this.isNavPanActive = false;
        this.panNavStartOffset = 0;
        this.panNavLastOffset = 0;
        this.panNavVelocity = 0;

        this.initialized = false;

        this.autoslideTimeout = parseInt(this.$container.data('carousel-autointerval') || 0);
        // console.log(this.autoslideTimeout);
        this.autoslideState = -1;
        this.autoslideTimer;

        // this.animationRepeater;
        // this.panReleaseTimeout;

        this.debug = function(debugMsg) { 
            if(that.options.carouselDebug) {                
                console.log(debugMsg); 
            }
            // console.log('current pos: '+that.currentPosition); 
            // console.log('doRedraw: '+that.doRedraw); 
            // console.log('hasChanged: '+that.hasChanged); 
            // console.log('itemsCurrentPxPosition: '+that.itemsCurrentPxPosition); 
            // console.log('navCurrentPxPosition: '+that.navCurrentPxPosition); 
            // console.log('carousel__content--home: '+this.$content.attr('style')); 
        };

        var that = this;


        this.init = function() {
            this.initialized = true;
            that.debug('init');
            this.generateNavItems();
            this.calculateDimensions();
            this.bindEvents();
            this.assignNavCheck();
            $(window).on('resize.'+that.options.carouselNamespace, $.throttle( 2500, function() {
                 setTimeout( function() {
                // that.debug('load resize orientationchange');
                    if(that.initialized) {
                        that.calculateDimensions();
                    }
                }, 200);
            }));
        };

        this.generateNavItems = function() {
            if (that.options.generateNavItems) {

                that.$navItemsContainer.each( function() {
                    var $navItems = $(this).find(that.options.selectorNavItems);
                    var nbSize = $navItems.size();

                    // there are no nav items here so we cannot clone anything
                    if (nbSize < 1) {
                        return true;
                    }

                    if(that.$items.size() != $navItems.size()) {


                        if(that.$items.size() > nbSize) {
                            for(var i = that.$items.size() - nbSize; i > 0; i--) {
                                var $clone = $navItems.eq(nbSize - 1).clone();
                                $navItems.eq(nbSize - 1).after($clone);
                            }
                        } else {
                            for(var i = nbSize; i > that.$items.size(); i--) {
                                $navItems.eq(i-1).remove();
                            }
                        }
                    }
                });
                that.$navItems = that.$container.find(that.options.selectorNavItems);
            }
        }

        this.bindEvents = function() {
            var hammerOptions = {
                // panLockToAxis: true,
                // panBlockHorizontal: true,
                // prevent_default: false
                touchAction: 'pan-y'
            };


            that.$navContainer.hammer({}).on('click.'+that.options.carouselNamespace, function(ev) {
                // console.log(ev);
                var moveToX = ev.offsetX - 24;
                // console.log(moveToX);
                that.stopAnimation();
                that.animateToNavOffset(moveToX, 500, that.easeOutSin);
            });

            that.$navNext.hammer({}).on('tap.'+that.options.carouselNamespace, function(ev) {
                ev.stopPropagation();
                ev.preventDefault();
                if($(this).hasClass('is-disabled'))
                    return false;
                that.stopAnimation();
                that.moveNext();
                return false;
            });

            that.$navPrev.hammer({}).on('tap.'+that.options.carouselNamespace, function(ev) {
                ev.stopPropagation();
                ev.preventDefault();
                if($(this).hasClass('is-disabled'))
                    return false;
                that.stopAnimation();
                that.movePrev();
                return false;
            });

            that.$navItemsContainer.each( function() {
                $(this).find(that.$navItems).each( function(i) {
                    $(this).hammer({}).on('tap.'+that.options.carouselNamespace, function(ev) {
                        that.stopAnimation();
                        that.moveToPosition(i * that.options.snapPositionsBy);
                        ev.stopPropagation();
                        return false;
                    });
                });
            });

            that.$content.hammer(hammerOptions);

            that.$items.find('a').on('click.'+that.options.carouselNamespace, function(ev) {
                console.log('----------------');
                console.log(that.isPanActive);
                console.log(that.animationTimerStart);
                console.log(!that.isPanActiveLink);
                console.log(ev);

                if(that.isPanActive || that.animationTimerStart || !that.isPanActiveLink) {
                    // console.log('stop!');
                    ev.preventDefault();
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    // that.stopAnimation();
                    return false;
                }
                return true;
            });

            
            // $(window).on('keydown', function(ev) {
            //  switch (ev.keyCode) {
            //      case 37:
            //          that.movePrev();
            //          break;
            //      case 39:
            //          that.moveNext();
            //          break;
            //      break;
            //  }
            // });

            if(that.options.useSwipe) {
                that.$content.on('swipeleft.'+that.options.carouselNamespace, function(ev) {
                    // console.log('swipeleft');
                    // ev.gesture.preventDefault();
                    that.moveNext();
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    that.panReleaseTimeout = setTimeout( function() {
                        that.isPanActiveLink = true;
                    }, 500);
                });

                that.$content.on('swiperight.'+that.options.carouselNamespace, function(ev) {
                    // console.log('swiperight');
                    // ev.gesture.preventDefault();
                    that.movePrev();
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    that.panReleaseTimeout = setTimeout( function() {
                        that.isPanActiveLink = true;
                    }, 500);
                });

            } else if (that.options.snapPositions) {
                that.debug('content in bind events');
                that.debug(that.$content);
                that.$content.hammer(hammerOptions).on('panstart.'+that.options.carouselNamespace, function(ev) {
                    that.$content.trigger('stopAutoslide');
                    that.stopAnimation();
                    if(typeof ev.gesture !== 'undefined') {
                        // ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    // console.log('ispanactive: '+that.isPanActive);
                    if(that.isPanActive)
                        return true;

                    that.panStartOffset = that.itemsCurrentPxPosition;
                    that.debug('-------------');
                    that.debug(that.itemsCurrentPxPosition);
                    that.debug(that.panStartOffset);
                    that.debug('-------------');
                    that.isPanActive = true;
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    // that.moveByOffset(-ev.gesture.deltaX);
                });
                that.debug(that.$content.data('hammer'));
                that.$content.on('panleft.'+that.options.carouselNamespace+' panright.'+that.options.carouselNamespace, function(ev) {
                    // console.log('panleft');
                    // console.log(ev);
                    if(!that.isPanActive)
                        return false;
                    that.$content.trigger('stopAutoslide');
                    that.stopAnimation();
                    if(typeof ev.gesture !== 'undefined') {
                        // ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    that.isPanActive = true;
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    that.panVelocity = ev.gesture.velocityX;
                    that.debug('------');
                    that.debug(that.panVelocity);
                    that.debug(that.panStartOffset);
                    that.debug(ev.gesture.deltaX);
                    that.moveToOffset(that.panStartOffset - ev.gesture.deltaX);
                    // that.moveByOffset(-ev.gesture.deltaX);
                });
                that.$content.on('panend.'+that.options.carouselNamespace, function(ev) {
                    // $('body').append('t');
                    that.stopAnimation();
                    that.$content.trigger('startAutoslide');
                    that.isPanActiveLink = true;
                    if(!that.isPanActive)
                        return true;

                    if(typeof ev.gesture !== 'undefined') {
                        // ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();

                    that.debug(Math.abs(that.panVelocity));

                    if(that.panVelocity !== 0) {
                        var moved = Math.abs(ev.gesture.deltaX) / that.itemWidth;
                        that.debug('moved: ' + moved);
                        that.debug(that.panVelocity);
                        if(Math.abs(that.panVelocity) < 0.5 && moved < 0.333) {
                            that.moveToCurrent();
                        } else if(that.panVelocity < 0) {
                            that.debug('velocity < 0 so moveNext');
                            that.moveNext();
                        } else {
                            that.debug('velocity > 0 so movePrev');
                            that.movePrev();
                        }

                        // that.panVelocity = that.panVelocity* 0.5;
                        // var timeToAnimate = Math.abs(that.panVelocity)*1000;
                        // that.panVelocity = that.panVelocity* 1000;
                        // that.animateToOffset( that.itemsCurrentPxPosition + that.panVelocity, timeToAnimate, that.easeOutQuad);
                        // that.panVelocity = 0;
                        clearTimeout(that.panReleaseTimeout);
                        // that.panReleaseTimeout = setTimeout( function() {
                            // that.isPanActiveLink = true;
                        // }, 500 + timeToAnimate);
                    } else {
                        that.moveToCurrent();
                        clearTimeout(that.panReleaseTimeout);
                        // that.panReleaseTimeout = setTimeout( function() {
                            // that.isPanActiveLink = true;
                        // }, 500);
                    }
                    that.isPanActive = false;
                    return false;
                    // console.log('panleft');
                    // console.log(ev.gesture);
                    // that.moveByOffset(-ev.gesture.deltaX);
                });

            } else {

                that.$content.hammer(hammerOptions).on('panstart.'+that.options.carouselNamespace, function(ev) {
                    that.stopAnimation();
                    if(typeof ev.gesture !== 'undefined') {
                        ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    if(that.isPanActive)
                        return true;

                    that.panStartOffset = that.itemsCurrentPxPosition;
                    that.isPanActive = true;
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    // that.moveByOffset(-ev.gesture.deltaX);
                });

                that.$content.on('pan.'+that.options.carouselNamespace, function(ev) {
                    // console.log('panleft');
                    // console.log(ev.gesture);
                    that.$content.trigger('stopAutoslide');
                    that.stopAnimation();
                    if(typeof ev.gesture !== 'undefined') {
                        ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    that.isPanActive = true;
                    clearTimeout(that.panReleaseTimeout);
                    that.isPanActiveLink = false;
                    that.panVelocity = ev.gesture.velocityX;// * (- ev.gesture.deltaX / Math.abs(ev.gesture.deltaX));
                    that.moveToOffset(that.panStartOffset - ev.gesture.deltaX);
                    // that.moveByOffset(-ev.gesture.deltaX);
                });
                that.$content.on('panend.'+that.options.carouselNamespace, function(ev) {
                    // $('body').append('t');
                    that.stopAnimation();
                    that.isPanActiveLink = true;
                    if(!that.isPanActive) {
                        that.$content.trigger('startAutoslide');
                        return true;
                    }

                    if(typeof ev.gesture !== 'undefined') {
                        ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();

                    if(that.panVelocity !== 0) {
                        // that.animateToOffset( that.itemsCurrentPxPosition + that.panVelocity*1000, Math.abs(that.panVelocity)*1000, that.easeLinear);
                        // if(that.panVelocity >= 1) {
                        //  that.panVelocity = 5 - (that.panVelocity * that.panVelocity);
                        // }
                        that.panVelocity = that.panVelocity* 0.5;
                        var timeToAnimate = Math.abs(that.panVelocity)*1000;
                        that.panVelocity = that.panVelocity* 1000;
                        that.animateToOffset( that.itemsCurrentPxPosition + that.panVelocity, timeToAnimate, that.easeOutQuad);
                        that.panVelocity = 0;
                        clearTimeout(that.panReleaseTimeout);
                        that.panReleaseTimeout = setTimeout( function() {
                            that.isPanActiveLink = true;
                            that.$content.trigger('startAutoslide');
                        }, 500 + timeToAnimate);
                    } else {
                        clearTimeout(that.panReleaseTimeout);
                        that.panReleaseTimeout = setTimeout( function() {
                            that.isPanActiveLink = true;
                            that.$content.trigger('startAutoslide');
                        }, 500);
                    }
                    that.isPanActive = false;
                    return false;
                    // console.log('panleft');
                    // console.log(ev.gesture);
                    // that.moveByOffset(-ev.gesture.deltaX);
                });

                that.$nav.hammer(hammerOptions);

                that.$nav.on('panstart.'+that.options.carouselNamespace, function(ev) {
                    that.$content.trigger('stopAutoslide');
                    that.stopAnimation();
                    if(typeof ev.gesture !== 'undefined') {
                        ev.gesture.preventDefault();
                    }
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    if(that.isNavPanActive)
                        return true;

                    that.panNavStartOffset = that.navCurrentPxPosition;
                    that.isNavPanActive = true;
                    // that.moveByOffset(-ev.gesture.deltaX);
                });

                that.$nav.on('pan.'+that.options.carouselNamespace, function(ev) {
                    // console.log('nav pan');
                    // console.log(ev.gesture);
                    ev.gesture.preventDefault();
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();

                    that.panNavVelocity = ev.gesture.velocityX;// * (ev.gesture.deltaX / Math.abs(ev.gesture.deltaX));
                    // console.log(that.panNavStartOffset - ev.gesture.deltaX);
                    that.moveToNavOffset(that.panNavStartOffset + ev.gesture.deltaX);
                    that.calculateCurrentPosition();
                    // that.moveByOffset(-ev.gesture.deltaX);
                });
                that.$nav.on('panend.'+that.options.carouselNamespace, function(ev) {
                    // console.log('release');
                    // console.log(ev.gesture);

                    that.$content.trigger('startAutoslide');
                    if(!that.isNavPanActive)
                        return true;
                    that.isNavPanActive = false;
                    if(that.panNavVelocity !== 0) {
                        // that.animateToOffset( that.itemsCurrentPxPosition + that.panNavVelocity*1000, 500, that.easeOutQuad);
                        // that.panNavVelocity * 2;
                        var timeToAnimate = Math.abs(that.panNavVelocity)*2000;
                        if(timeToAnimate < 500)
                            timeToAnimate = 500;
                        // if(that.panNavVelocity * timeToAnimate > 800) {
                        //  timeToAnimate = 1000;
                        //  that.panNavVelocity = 0.005;
                        // }
                        // that.panNavVelocity = that.panNavVelocity * that.itemsMaxLeftPosition /  that.navMaxLeftPosition;
                        that.animateToOffset( that.itemsCurrentPxPosition + that.panNavVelocity*timeToAnimate, timeToAnimate, that.easeOutQuad);
                        that.panNavVelocity = 0;
                    }
                    // console.log('nav panend');
                    // console.log(ev);
                    ev.gesture.preventDefault();
                    ev.stopPropagation();
                    ev.stopImmediatePropagation();
                    that.calculateCurrentPosition();
                    // that.moveByOffset(-ev.gesture.deltaX);
                });
            }

            that.$container.on('mouseenter.'+that.options.carouselNamespace, function() {
                that.$content.trigger('stopAutoslide');
                return true;
            });
            that.$container.on('mouseleave.'+that.options.carouselNamespace, function() {
                that.$content.trigger('startAutoslide');
                return true;
            });

            that.$content.on('startAutoslide.'+that.options.carouselNamespace, function() {
                // return true;
                if(!that.autoslideTimeout) {
                    return true;
                }
                clearInterval(that.autoslideTimer);
                var timeout = that.autoslideTimeout * 1000;
                if(that.autoslideState == -1) {
                    setTimeout( function(){
                        that.$content.trigger('startAutoslide');
                        that.autoslideState = 1;
                    },2000);
                }
                that.autoslideTimer = setInterval( function() {
                    that.moveNext();
                }, timeout);
                return true;
            });

            that.$content.on('stopAutoslide.'+that.options.carouselNamespace, function() {
                clearInterval(that.autoslideTimer);
                return true;
            });

            if(that.autoslideTimeout > 0) {
                that.$content.trigger('startAutoslide.'+that.options.carouselNamespace);
            }

            // that.$content.on('panleft', function(ev) {
            //  console.log('panleft');
            //  ev.gesture.preventDefault();
            //  console.log(ev.gesture.deltaX);
            //  that.moveByOffset(-ev.gesture.deltaX);
            // });
            // that.$content.on('panleft', function(ev) {
            //  console.log('panleft');
            //  ev.gesture.preventDefault();
            //  console.log(ev.gesture.deltaX);
            //  that.moveByOffset(-ev.gesture.deltaX);
            // });
        };

        this.destroy = function() {
            var that = this;
            that.initialized = false;
            // console.log('Destroy!');
            that.unbindEvents();
            that.decalculateDimensions();
            var  carouselInstance = that.$container.data('mk.mkCarousel');
            that.$container.data('mk.mkCarousel', false);
            carouselInstance = null;
            // delete carouselInstance;
        };

        this.unbindEvents = function() {
            var that = this;
            that.$content.trigger('stopAutoslide.'+that.options.carouselNamespace);
            if(typeof(that.$content.data('hammer')) !== 'undefined' && that.$content.data('hammer')) {
                that.$content.data('hammer').destroy();
                that.$content.data('hammer', false);
            }

            that.$navContainer.off('.'+that.options.carouselNamespace);
            that.$navNext.off('.'+that.options.carouselNamespace);
            that.$navPrev.off('.'+that.options.carouselNamespace);
            that.$navItems.off('.'+that.options.carouselNamespace);
            that.$content.off('.'+that.options.carouselNamespace);

            that.$items.find('a').off('.'+that.options.carouselNamespace);

            that.$nav.off('.'+that.options.carouselNamespace);
            that.$container.off('.'+that.options.carouselNamespace);

            that.$content.off('.'+that.options.carouselNamespace);
            $(document).off('.'+that.options.carouselNamespace);
            $(window).off('.'+that.options.carouselNamespace);
        };

        this.calculateImgDimensions = function() {
            that.debug('calc img dimensions');
            // var wh = $(window).height();
            // var ww = $(window).width();
            // var otherDimensions = that.options.getOtherElementsDimensions();

            // var $img = that.$items.find('img');

            // var newHeight = wh - otherDimensions - parseInt(that.$content.css('margin-bottom')) - that.$navContainer.outerHeight();
            // if(that.options.minHeight && that.options.minHeight > newHeight) {
            //  newHeight = that.options.minHeight;
            // }

            // $img.attr('style','');
            // var naturalHeight = $img.eq(0).height();
            // var ww2hRatio = ww/naturalHeight;

            // if(newHeight < naturalHeight) {
            //  $img.each( function() {
            //      var w = Math.ceil($(this).width());
            //      var h = Math.ceil($(this).height());
            //      var w2hRatio = w/h;

            //      // limit using height
            //      if(ww2hRatio > w2hRatio || 1) {
            //          $(this).height(Math.ceil(newHeight));
            //          $(this).width( Math.ceil(w2hRatio * newHeight) );
            //      } else {
            //          // limit using width
            //          $(this).width( Math.ceil(ww*0.8) );
            //          $(this).height( Math.ceil(ww*0.8/w2hRatio) );
            //      }

            //  });
            // }
        };

        this.calculateItemDimensions = function() {
            var $items = that.$items.filter( that.options.selectorWidthItem );
            this.debug('items - dimensions:');
            this.debug($items);
            this.debug($items.size());
            if($items.size() < 1)
                return true;

            var parentWidth = $items.parents( that.options.selectorWidthContainer ).width();
            this.debug(parentWidth);
            $items.attr('style','');

            var $itemsSpecial = that.$container.find( that.options.selectorWidthSpecialContainer );
            $itemsSpecial.width('');

            var innerW = $items.eq(0).width();
            var outerW = $items.eq(0).outerWidth();
            // if(innerW != outerW) {
                // parentWidth += innerW - outerW;
            // }
            that.itemWidth = Math.floor(parentWidth / that.options.fitNoItemsByContainer);
            // console.log('itemwidth:');
            // console.log(that.options.fitNoItemsByContainer);
            // console.log(parentWidth / that.options.fitNoItemsByContainer);
            $items.width(that.itemWidth);

//          console.log('itemsSpecial:');
//          console.log($itemsSpecial);

            if($itemsSpecial.size() < 1)
                return true;

//          console.log($itemsSpecial.data('special-width'));

            $itemsSpecial.each( function() {
                $(this).width(parentWidth * $(this).find('>*').size());
            });
        };

        this.decalculateItemDimensions = function() {
            var $items = that.$items.filter( that.options.selectorWidthItem );
            if($items.size() < 1)
                return true;
            $items.attr('style','');
            
            var $itemsSpecial = that.$container.find( that.options.selectorWidthSpecialContainer );
            if($itemsSpecial.size() < 1)
                return true;
            $itemsSpecial.attr('style','');
        };

        this.calculateNavLimits = function() {
            that.navMaxLeftPosition = that.$navContainer.width() - that.$nav.width();
        };

        this.calculateDimensions = function() {
            that.debug('calculateDimensions');
            var totalImageWidth = 0;

            // reset previous
            this.debug('items:');
            this.debug(this.$items);
            that.$content.attr('style','');
            that.$items.attr('style' ,'');
            that.doRedraw = true;
            that.hasChanged = true;
            that.itemsCurrentPxPosition = 0;
            that.navCurrentPxPosition = 0;

            var containerWidth = this.$containerInner.width();
            var containerHalfWidth = containerWidth/2;

            if(that.options.calculateImgDimensions) {
                that.calculateImgDimensions();
            }

            if(that.options.calculateItemDimensions) {
                that.calculateItemDimensions();
            }
            
            that.calculateNavLimits();

            var offset = 0, currentWidth = 0, innerWidth = 0;

            that.$items.each( function(i) {
                if(!that.options.moveToCenter) {
                    currentWidth = $(this).outerWidth();
                    offset = 0;
                } else {

                    offset = containerHalfWidth;
                    currentWidth = $(this).outerWidth();
                    innerWidth = $(this).width();
                    offset = containerHalfWidth - (currentWidth / 2);
                    if(that.options.calculateContainerOffset)
                        offset += (currentWidth - innerWidth)/2;
                    // offset = containerHalfWidth - (currentWidth / 2) + 15;

                }
                $(this).data('carousel-offset', totalImageWidth - offset);
                $(this).data('carousel-item', i);
                totalImageWidth += currentWidth;
                // that.debug(currentWidth);
                // that.debug(innerWidth);
            });
            that.debug(totalImageWidth);
            that.$content.width(totalImageWidth);

            that.itemsMaxLeftPosition = that.$content.width() - (that.$items.eq(0).width() * that.options.fitNoItemsByContainer);
            that.debug('calc max left:');
            that.debug(that.itemsMaxLeftPosition);

            that.currentPosition = 0;
            if(that.options.moveToCenter) {
                that.currentPosition = Math.floor(that.$items.size()/2);
            }

            // setTimeout(function() {
                that.moveToCurrentImmediate();
            // }, 10);

            that.$container.css('opacity', 0.99);
            setTimeout( function() {
                that.$container.css('opacity', 1);
            }, 10);
            setTimeout( function() {
                that.$container.css('opacity', 0.99);
            }, 100);
            setTimeout( function() {
                that.$container.css('opacity', 1);
            }, 1000);

            that.debug('calculateDimensions: end');
            // console.log((  ));
        };

        this.decalculateDimensions = function() {
            that.debug('decalculateDimensions');
            that.$content.attr('style','');
            that.decalculateItemDimensions();
        };

        if (Modernizr.csstransforms3d) {
            this.moveElementTo = function($element, offsetPx) {
                // console.log('3d');
                $element.css('-webkit-transform',  'translate3d('+offsetPx+'px, 0px, 0px)');
                $element.css('-moz-transform',  'translate3d('+offsetPx+'px, 0px, 0px)');
                $element.css('transform',  'translate3d('+offsetPx+'px, 0px, 0px)');
            };
        } else if (Modernizr.csstransforms) {
            this.moveElementTo = function($element, offsetPx) {
                // console.log('2d');
                $element.css('-webkit-transform',  'translateX('+offsetPx+'px)');
                $element.css('-moz-transform',  'translateX('+offsetPx+'px)');
                $element.css('transform',  'translateX('+offsetPx+'px)');
            };
        } else {
            this.moveElementTo = function($element, offsetPx) {
                // console.log('left');
                $element.css({ 'left': ''+offsetPx+'px'});
            };
        }

        this.calculateCurrentPosition = function() {
            that.$items.each( function() {
                if($(this).data('carousel-offset') < that.itemsCurrentPxPosition) {
                    that.currentPosition = $(this).data('carousel-item');
                    // console.log(that.currentPosition);
                }
            });
        };

        this.moveContentToOffset = function(offsetPx) {
            // brute
            // that.$content.css('left', -offsetPx);
            if(that.itemsCurrentPxPosition != offsetPx) {
                that.doRedraw = true;
                that.hasChanged = true;
            }
            that.itemsCurrentPxPosition = offsetPx;
        };

        this.moveContentByOffset = function(offsetPx) {
            // brute
            // that.$content.css('left', -offsetPx);
            that.itemsCurrentPxPosition += offsetPx;
            that.$items.each( function() {
                if($(this).data('carousel-offset') > that.itemsCurrentPxPosition) {
                    that.currentPosition = $(this).data('carousel-item');
                }
            });
        };

        this.moveNavToOffset = function(offsetPx) {
            if(that.navCurrentPxPosition != offsetPx) {
                that.doRedraw = true;
                that.hasChanged = true;
            }
            that.navCurrentPxPosition = offsetPx;
        };

        this.moveNavToContentOffset = function() {
            var movedTo = that.itemsCurrentPxPosition / that.itemsMaxLeftPosition;
            this.moveNavToOffset(movedTo * that.navMaxLeftPosition);
        };

        this.moveContentToNavOffset = function() {
            var movedTo = that.navCurrentPxPosition / that.navMaxLeftPosition;
            this.moveContentToOffset(movedTo * that.itemsMaxLeftPosition);
        };


        this.moveToOffset = function(offsetPx) {
            that.moveContentToOffset(offsetPx);
            that.moveNavToContentOffset();
            that.requestRedraw();
        };

        this.moveByOffset = function(offsetPx) {
            that.moveContentByOffset(offsetPx);
            that.moveNavToContentOffset();
            that.requestRedraw();
        };

        this.moveToNavOffset = function(navOffsetPx) {
            that.moveNavToOffset(navOffsetPx);
            that.moveContentToNavOffset();
            that.requestRedraw();
        };


        that.easeLinear = function(inTime, duration) {
            return inTime/duration;
        };

        that.easeInSin = function(inTime, duration) {
            return 1 - Math.cos(inTime/duration * (Math.PI/2));
        };

        that.easeOutSin = function(inTime, duration) {
            return Math.sin(inTime/duration * (Math.PI/2));
        };

        that.easeInQuad = function(inTime, duration) {
            return (inTime*inTime) / (duration*duration);
        };

        that.easeOutQuad = function(inTime, duration) {
            return 1 - ((duration - inTime)*(duration - inTime)) / (duration*duration);
        };

        

        this.animateToOffset = function(targetOffset, duration, easingFn) {
            // that.debug('animate to offset');
            this.stopAnimation();
            if(!easingFn) {
                easingFn = that.easeLinear;
            }

            var start = this.itemsCurrentPxPosition;
            var end = targetOffset;
            var diff = 0;
            that.debug('animate to offset');
            that.debug(end);
            that.debug(that.itemsMaxLeftPosition);
            if(end < 0) {
                diff = start - end;
                end = 0;
                duration = duration *  start/ diff;
            }
            if(end > that.itemsMaxLeftPosition) {
                diff = end - start;
                end = that.itemsMaxLeftPosition;
                var diff2 = end - start;
                duration = duration * diff2 / diff;
            }

            
            function setCurrentOffset(timer) {
                var currentTime = timer - that.animationTimerStart;
                if(currentTime >= duration) {
                    that.showDebug = false;
                    that.stopAnimation();
                    that.moveToOffset(end);
                    that.onAnimationEnd();
                    return true;
                }

                var diffPx = end - start;
                var currentPos = start + Math.round(diffPx* easingFn(currentTime, duration) );
                that.moveToOffset(currentPos);
            }

            that.startAnimation( setCurrentOffset );
        };


        this.animateToNavOffset = function( navOffset, duration, easingFn ){
            var movedTo = navOffset / that.navMaxLeftPosition;
            this.animateToOffset(movedTo * that.itemsMaxLeftPosition, duration, easingFn);
        };

        that.showDebug = false;

        this.requestRedraw = function() {
            // that.debug('request redraw');
            if(that.hasChanged) {
                if(!that.animationTimerStart)
                    requestAnimationFrame(that.drawChanges);

                that.hasChanged = false;
            }
        };

        this.startAnimation = function( animateFn ) {
            that.debug('start animation');
            that.animationTimerStart = 0;

            var animateFnCallback = function(timer) {
                cancelAnimationFrame(that.animationRepeater);
                if(!that.animationTimerStart) {
                    that.animationTimerStart = timer;
                    that.animationRepeater = requestAnimationFrame(animateFnCallback);
                    return true;
                }

                animateFn(timer);
                that.drawChanges();

                if(that.animationTimerStart)
                    that.animationRepeater = requestAnimationFrame(animateFnCallback);
            };

            that.animationRepeater = requestAnimationFrame(animateFnCallback);
        };

        this.stopAnimation = function() {
            // console.log(that.animationRepeater);
            cancelAnimationFrame(that.animationRepeater);
            // console.log(that.animationRepeater);
            that.animationRepeater = false;
            that.animationTimerStart = 0;
            
            // that.$content.css('-webkit-transform','scale(0.9)');
            // setTimeout( function() {that.$content.css('-webkit-transform','scale(1)');}, 0)
            // var n = document.createTextNode(' ');
            // that.$content.append(n);
            // setTimeout(function(){n.parentNode.removeChild(n)}, 0);

            // that.debug('stop animation');
        };

        this.onAnimationEnd = function() {
            this.assignNavCheck();

        };

        this.assignNavCheck = function() {
            if(this.$navCheck.size()) {
                var currentHref = this.$items.eq(this.currentPosition).data('slide-href');
                this.$navCheck.attr('href', currentHref);
            }
        };

        this.drawChanges = function() {
            if(!that.doRedraw)
                return true;

            that.moveElementTo(that.$content, -that.itemsCurrentPxPosition);
            that.moveElementTo(that.$nav, that.navCurrentPxPosition);
            that.doRedraw = false;
            return true;
        };

        this.getPositionOffset = function(pos) {
            return that.$items.eq(pos).data('carousel-offset');
        };

        this.moveNext = function() {

            if(that.options.snapPositionsBy > 1) {
                if(that.currentPosition+that.options.snapPositionsBy >= that.$items.size()) {
                    if(that.currentPosition+1 >= that.$items.size() || that.currentPosition+that.options.snapPositionsBy+1 >= that.$items.size()) {
                        if(that.options.allowLoop) {
                            that.currentPosition = 0;
                        }
                    } else {
                        that.currentPosition = that.$items.size() - 1;
                    }
                } else {
                    that.currentPosition += that.options.snapPositionsBy;
                }
            } else {
                that.currentPosition++;
                if(that.currentPosition >= that.$items.size()) {
                    if(that.options.allowLoop) {
                        that.currentPosition = 0;
                    } else {
                        that.currentPosition--;
                    }
                }
            }

            this.navSelect();
            var moveToOffset = that.getPositionOffset(that.currentPosition);
            that.debug(that.currentPosition);
            that.debug(moveToOffset);
            that.animateToOffset(moveToOffset, 500, that.easeOutQuad);
            // that.moveToOffset(moveToOffset);
        };

        this.movePrev = function() {
            if(that.options.snapPositionsBy > 1) {
                if(that.currentPosition - that.options.snapPositionsBy < 0) {
                    if(that.options.allowLoop) {
                        that.currentPosition = that.$items.size() - that.options.snapPositionsBy;
                    } else {
                        that.currentPosition = 0;
                    }
                } else {
                    if(that.currentPosition % that.options.snapPositionsBy === 0) {
                        that.currentPosition -= that.options.snapPositionsBy;
                    } else {
                        that.currentPosition -= (that.currentPosition % that.options.snapPositionsBy);
                    }
                }
            } else {
                that.currentPosition--;
                if(that.currentPosition < 0) {
                    if(that.options.allowLoop) {
                        that.currentPosition = that.$items.size() - 1;
                    } else {
                        that.currentPosition = 0;
                    }
                    // return true;
                }
            }

            this.navSelect();
            var moveToOffset = that.getPositionOffset(that.currentPosition);
            that.animateToOffset(moveToOffset, 500, that.easeOutQuad);
        };

        this.moveToPosition = function(i) {
            that.currentPosition = i;
            if(that.currentPosition < 0) {
                // that.currentPosition = 0;
                that.currentPosition = that.$items.size() - 1;
                // return true;
            } else if(that.currentPosition >= that.$items.size()) {
                // that.currentPosition--;
                that.currentPosition = 0;
                // return true;
            }

            this.navSelect();
            var moveToOffset = that.getPositionOffset(that.currentPosition);
            that.animateToOffset(moveToOffset, 500, that.easeOutQuad);
        };

        this.moveToCurrent = function() {
            this.navSelect();
            var moveToOffset = that.getPositionOffset(that.currentPosition);
            that.animateToOffset(moveToOffset, 500, that.easeOutQuad);
        };

        this.moveToCurrentImmediate = function() {
            this.navSelect();
            that.debug('moveToCurrentImmediate');
            var moveToOffset = that.getPositionOffset(that.currentPosition);
            that.debug('moveToCurrentImmediate: '+moveToOffset);
            that.moveToOffset(moveToOffset);
            that.debug('moveToCurrentImmediate: end');
        };

        this.navSelect = function() {
            that.$navItemsContainer.each( function() {
                var selectPos = ((that.currentPosition)/ that.options.snapPositionsBy) ;
                // console.log('-----');
                // console.log(that.currentPosition);
                // console.log(that.options.snapPositionsBy);
                // console.log(selectPos);
                $(this).find(that.$navItems).removeClass('is-active').eq(selectPos).addClass('is-active');
            });

            this.$navCurrentPage.text( Math.ceil((that.currentPosition + 1) / that.options.snapPositionsBy) );
            if(!that.options.allowLoop) {
                if(that.currentPosition === 0) {
                    that.$navPrev.addClass('is-disabled');
                } else {
                    that.$navPrev.removeClass('is-disabled');
                }

                if(that.options.snapPositionsBy > 1) {
                    if(that.currentPosition+that.options.snapPositionsBy >= that.$items.size()) {
                        if(that.currentPosition+1 >= that.$items.size() || that.currentPosition+that.options.snapPositionsBy+1 >= that.$items.size()) {
                            that.$navNext.addClass('is-disabled');
                        } else {
                            that.$navNext.removeClass('is-disabled');
                        }
                    } else {
                        that.$navNext.removeClass('is-disabled');
                    }
                } else {
                    that.$navNext.removeClass('is-disabled');
                    if((that.currentPosition+1) >= that.$items.size()) {
                        that.$navNext.addClass('is-disabled');
                    }
                }
            }

            return true;
        };

        this.init();

    };

    $.fn.mkCarousel = function (option, _relatedTarget) {
        return this.each(function () {
            var $this   = $(this);
            var featuredSliderInstance    = $this.data('mk.mkCarousel');
            // console.info(featuredSliderInstance);
            var options = $.extend({}, Carousel.Defaults, $this.data(), typeof option == 'object' && option);

            if (!featuredSliderInstance) {
                $this.data('mk.mkCarousel', (featuredSliderInstance = new Carousel(this, options)));
            }
            if (typeof option == 'string') {
               featuredSliderInstance[option](_relatedTarget); 
               if(option == 'destroy') {
                $this.data('mk.mkCarousel', undefined);
               }
            }
        });
    };

    // $.fn.mkCarousel.Constructor = Carousel;

}(jQuery);