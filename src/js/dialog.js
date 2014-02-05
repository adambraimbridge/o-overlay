"use strict";

var $ = require('jquery'),
    domUtils = require('./domUtils'),
    doAfterTransition = require('./doAfterTransition'),
    L = 'left',
    R = 'right',
    T = 'top',
    B = 'bottom',
    H = 'height',
    W = 'width',
    win = $(window),
    html = $('html'),
    presets = {},
    templates = {},
    isAnimatable = html.hasClass('csstransforms'),
    isFlexbox = html.hasClass('flexbox') || html.hasClass('flexboxlegacy'),
    dialogs = isAnimatable ? Array(2) : [],
    globalListenersApplied = false,
    dimensionCalculators = {
        width: function (dialog) {
            return dialog.content.outerWidth() + domUtils.getSpacing(dialog.wrapper, 'left') + domUtils.getSpacing(dialog.wrapper, 'right');
        },
        height: function (dialog) {
            return dialog.content.outerHeight() + domUtils.getSpacing(dialog.wrapper, 'top') + domUtils.getSpacing(dialog.wrapper, 'bottom');
        }
    },
    defaults = require('./defaults');

var trigger = function (opts, trigger) {

        var lastDialog;

        if (dialogs[0] && dialogs[0].active) {
            
            lastDialog = dialogs[0];
            close(lastDialog);

            if (trigger === lastDialog.trigger) {
                return;
            }
        }

        var dialog = configureNewDialog(opts, trigger);
        
        if (!dialog) {
            dialog.opts.onFail(dialog);
            return;
        }
        dialog.opts.onTrigger(dialog);
        
        
        dialog.content.html(dialog.opts.content);

        if (dialog.opts.hasCloseButton) {
            dialog.content.append('<button class="o-dialog__close">close</button>');
        }

        dialog.body = dialog.content.is(dialog.opts.bodySelector) ? dialog.content : dialog.content.find(dialog.opts.bodySelector);
        dialog.heading = dialog.content.find(dialog.opts.headingSelector);

        dialog.opts.hasHeading = !!dialog.heading.length;
        assignClasses(dialog);
        dialog.opts.onBeforeRender(dialog);
        attach(dialog);
        dialog.opts.onAfterRender(dialog);
    },

    createDialogHtml = function () {
        var wrapper = $('<div class="o-dialog"></div>'),
            content = $('<section class="o-dialog__content"></section>'),
            overlay = $('<div class="o-dialog__overlay"></div>'),
            dialog = {
                wrapper: wrapper,
                content: content,
                overlay: overlay
            };

        wrapper.append(content);

        globalListenersApplied || globalListeners();

        content.on('click.o-dialog', function (ev) {
            ev.oDialogContentClick = true;
        });

        return dialog;
    },

    isContentClick = function (ev, dialog) {
        return !!$(dialog.content).has(ev.target).length;
    },

    globalListeners = function () {
        $(document).on('close.o-dialog', close);

        globalListenersApplied = true;
    },

    getEmptyDialog = function () {

        if (isAnimatable) {
            if (dialogs[0] && dialogs[0].active) {
                dialogs.reverse();
            }
        }
        if (!dialogs[0]) {
            dialogs[0] = createDialogHtml();
        }

        return dialogs[0];
    },

    copyContent = function (content) {
        return content[0].nodeName === 'SCRIPT' ? $(content.html()): content.clone();
    },

    configureNewDialog = function (opts, trigger) {
        var dialog = getEmptyDialog();

        if (typeof opts === 'string') {
            opts = {
                src: opts
            };
        }

        if (!opts.srcType) {
            if (/^(https?\:\/)?\//.test(opts.src)) {
                opts.srcType = 'url';
            } else if ((opts.content = $(opts.src)) && opts.content.length) {
                opts.srcType = 'selector';
                opts.content = copyContent(opts.content);
            } else {
                opts.srcType = 'string';
                opts.content = opts.src;
            }
        } else if (opts.srcType === 'selector') {
            opts.content = $(opts.src);
            opts.content = copyContent(opts.content);
        }

        opts = $.extend({}, defaults, presets[opts.preset] || {}, opts);

        if (opts.isAnchoredToTrigger && !trigger) {
            return;
        }

        dialog.trigger = trigger;

        dialog.opts = opts;

        return dialog;
    },
    attach = function (dialog) {

        dialog.parent = (!dialog.opts.isAnchoredToTrigger || !dialog.trigger) ? 'body' : dialog.trigger.offsetParent;

        if (dialog.opts.hasOverlay) {
            dialog.overlay.appendTo('body');
        }

        dialog.wrapper.appendTo(dialog.parent);


        
        dialog.wrapper[0].offsetWidth; // forces redraw before .is-open starts the animation
        dialog.wrapper.addClass('is-open');
        if (dialog.opts.hasOverlay) {
            dialog.overlay.addClass('is-open');
        }
        dialog.content.focus();

        dialog.width = dimensionCalculators.width(dialog);
        dialog.height = dimensionCalculators.height(dialog);
        dialog.active = true;
        respondToWindow(dialog);

        win.on('resize.o-dialog', function() {
            respondToWindow(dialog);
        });

        if (dialog.opts.isDismissable) {
            setTimeout(function () {
                $('body').on('click.o-dialog', function (ev) {
                    if (dialog.active) {
                        if (!dialog.content[0].contains(ev.target) || (dialog.opts.hasCloseButton && $(ev.target).is('.o-dialog__close'))) {
                            close(dialog);
                        }
                    }
                });
            }, 1);


            $(document).on('keyup.o-dialog', function (ev) {
                if (ev.keyCode === 27) {
                    close();
                }
            });
        }
    },



    assignClasses = function (dialog) {
        dialog.wrapper[0].className = 'o-dialog o-dialog--' + dialog.opts.preset + ' ' + dialog.opts.outerClasses + (dialog.opts.hasCloseButton ? ' o-dialog--closable' : '');
        dialog.overlay[0].className = 'o-dialog__overlay o-dialog--' + dialog.opts.preset + '__overlay';
        dialog.content[0].className = 'o-dialog__content o-dialog--' + dialog.opts.preset + '__content' + ' ' + dialog.opts.innerClasses + (dialog.opts.hasHeading ? '' : ' o-dialog__body');
    },

    anchorDropdown = function (dialog) {
        if (dialog.opts.isAnchoredToTrigger) {

            var align,
                offset,
                trigger = dialog.trigger,
                triggerRightEdge = trigger.offsetLeft + trigger.offsetWidth;

            if (dialog.width > win.width() || triggerRightEdge - dialog.width < 0) {
                align = 'l';
            } else {
                align = 'r';
            }

            // Pseudo code of how this needs to work
            // P = preferred edge to align to
            // O = opposite edge of dropdown
            // Pw, Ow = edges of window
            // if (O is too close to Ow) {
            //     swap P and O
            //     if (O is too close to Ow) {
            //         go to full width mode
            //          // need to implement a way that something other than the basic window width test can force full width
            //     }
            // } else {
            //     no problemo
            // }

            if (dialog.isFullWidth) {
                offset = 0;
            } else if (align === 'l') {
                offset = trigger.offsetLeft;
            } else {
                offset = trigger.offsetParent.offsetWidth - triggerRightEdge;
            }

            if (align === 'l') {
                dialog.wrapper.css('left', offset).addClass('o-dialog--dropdown--left').removeClass('o-dialog--dropdown--right');
            } else {
                dialog.wrapper.css('right', offset).addClass('o-dialog--dropdown--right').removeClass('o-dialog--dropdown--left');
            }

            if (dialog.opts.preset === 'dropdown') {
                dialog.wrapper.css('top', trigger.offsetTop + trigger.offsetHeight);
            } else {
                dialog.wrapper.css('bottom', trigger.offsetParent.offsetHeight - trigger.offsetTop);
            }
        }
    },

    close = function (dialog, destroy) {
        dialog.opts.onBeforeClose(dialog);
        dialog = dialog || dialogs[0];
        if (!dialog.active) {
            return;
        }

        win.off('resize.o-dialog');
        if (dialog.opts.isDismissable) {
            $('body').off('click.o-dialog');
            $(document).off('keyup.o-dialog');
        }
        if (isAnimatable && !destroy) {
            var wrapper = dialog.opts.hasOverlay ? dialog.wrapper.add(dialog.overlay) : dialog.wrapper ;
            doAfterTransition(wrapper, 'is-open', 'remove', wrapper.add(dialog.content), function () {
                detach(dialog);
            });
            
        } else {
            dialog.wrapper.removeClass('is-open');
            detach(dialog, destroy);
        }
        
    },

    detach = function (dialog, destroy) {
        dialog.active = false;
        dialog.content.empty();
        dialog.wrapper.detach().attr('style', null);
        if (dialog.opts.hasOverlay) {
            dialog.overlay.detach();
        }
        if (destroy) {
            dialogs = Array(2);
            win = null;
        }
        dialog.opts.onAfterClose(dialog);
    },

    respondToWindow = function (dialog) {
        dialog.opts.onBeforeResize(dialog);
        reAlign('width', dialog);
        reAlign('height', dialog);
        anchorDropdown(dialog);
        dialog.opts.onAfterResize(dialog);
    },

    reAlign = function (dimension, dialog) {

        if ((dimension === H && !dialog.opts.isCenteredVertically) || (dimension === W && !dialog.opts.isCenteredHorizontally)) {
            return;
        }

        var edge = dimension === W ? L : T,
            otherDimension = dimension === W ? H : W,
            capitalisedDimension = dimension.charAt(0).toUpperCase() + dimension.substr(1),
            capitalisedOtherDimension = otherDimension.charAt(0).toUpperCase() + otherDimension.substr(1);

        if (dialog.opts['snapsToFull' + capitalisedDimension]) {
            if (win[dimension]() <= dialog[dimension]) {
                dialog['isFull' + capitalisedDimension] = true;
                dialog.wrapper.addClass('o-dialog--full-' + dimension);
                if (!isFlexbox) {
                    dialog.content.css('margin-' + edge, 0);
                    adjustBodyHeight(dialog, true);
                }
            } else {
                dialog['isFull' + capitalisedDimension] = false;
                dialog.wrapper.removeClass('o-dialog--full-' + dimension).attr('style', null);
                if (!isFlexbox) {
                    adjustBodyHeight(dialog, false);
                }
                if (!dialog['isFull' + capitalisedOtherDimension]) {
                    dialog[dimension] = Math.max(
                        dimensionCalculators[dimension](dialog),
                        dialog[dimension]
                    );
                }

                if (!isFlexbox) {
                    dialog.content.css('margin-' + edge, -dialog.content['outer' + capitalisedDimension]()/2);
                }
            }
        }
        if (!isFlexbox && dimension === W && !dialog.opts.isCenteredHorizontally) {
            dialog.content.css('margin-' + edge, 'auto');
        }

    },

    adjustBodyHeight = function (dialog, fullHeight) {
        if (dialog.opts.hasHeading) {
            if (fullHeight) {
                dialog.body.height(dialog.content.height() - dialog.heading.outerHeight());
            } else {
                dialog.body.css('height', '');
            }
        }
    };


module.exports = {
    close: close,
    trigger: trigger,
    destroy: function () {
        close(null, true);
    },
    addPreset: function (name, conf) {
        presets[name] = $.extend({}, defaults, conf);
    },
    addTemplate: function (name, tpl) {
        templates[name] = tpl;
    },
    removeTemplate: function (name) {
        templates[name] = undefined;
    }
};
