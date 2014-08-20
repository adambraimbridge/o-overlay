/* global afterEach, beforeEach, describe, it, o, expect, spyOn */
'use strict';

var Overlay,
    testContent = '<div class="test-overlay"><span class="test-overlay__text">Hello Overlay</span></div>';

describe('smoke-tests (./overlay.js)', function() {
    beforeEach(function() {
        Overlay = require('../../src/js/overlay');
    });

    afterEach(function() {
        var overlays = document.querySelectorAll('.o-overlay, .o-overlay-shadow');
        for (var i = 0; i < overlays.length; i++) {
            overlays[i].parentNode.removeChild(overlays[i]);
        }
    });

    describe('opening and closing', function() {

        beforeEach(function() {
            var el = document.createElement('button');
            el.setAttribute('data-o-overlay-src', '.test-overlay');
            el.setAttribute('data-o-overlay-heading-title', 'test title');
            el.className = 'o-overlay-trigger';
            document.body.appendChild(el);

            document.body.innerHTML += testContent;
        });

        afterEach(function() {
            var testEl = document.querySelector('.test-overlay');
            testEl.parentNode.removeChild(testEl);
            var triggerEl = document.querySelector('.o-overlay-trigger');
            triggerEl.parentNode.removeChild(triggerEl);
            Overlay.destroy();
        });

        it('should open with correct content when trigger is clicked', function() {
            console.log("window.o");
            var trigger = document.querySelector('.o-overlay-trigger');
            o.fireEvent(trigger, 'click');
            var overlays = document.querySelectorAll('.o-overlay');
            expect(overlays.length).toBe(0);
            
            Overlay.init();
            
            o.fireEvent(trigger, 'click');

            var wrapper = document.querySelectorAll('.o-overlay'),
            content = wrapper[0].querySelectorAll('.o-overlay__content'),
            heading = wrapper[0].querySelectorAll('.o-overlay__heading'),
            shadow = document.querySelectorAll('.o-overlay-shadow'),
            close = heading[0].querySelectorAll('.o-overlay__close'),
            testBody = content[0].querySelectorAll('.test-overlay');
        
            expect(wrapper.length).toBe(1);
            expect(content.length).toBe(1);
            expect(shadow.length).toBe(1);
            expect(heading.length).toBe(1);
            expect(close.length).toBe(1);
            expect(testBody.length).toBe(1);

            o.fireEvent(close[0], 'click');

        });
        it('modal should be closable with esc key, close button and with new layer', function() {
            var trigger = document.querySelector('.o-overlay-trigger');
            var originalOverlayClose = Overlay.prototype.close;
            spyOn(Overlay.prototype, 'close');
            Overlay.init();
            
            o.fireEvent(trigger, 'click');

            var close = document.querySelector('.o-overlay__close');

            o.fireEvent(close, 'click');
            o.fireEvent(document.body, 'click');
            o.fireEvent(document.body, 'keyup', {
                keyCode: 27
            });
            o.fireCustomEvent(document.body, 'oLayers.new');

            expect(Overlay.prototype.close.calls.count()).toBe(3);
            var currentOverlay = Overlay.getOverlays()[0];
            currentOverlay.close = originalOverlayClose;
            currentOverlay.close();

        });

        it('non-modal should be closable in different ways', function() {
            var trigger = document.querySelector('.o-overlay-trigger');
            var originalOverlayClose = Overlay.prototype.close;
            spyOn(Overlay.prototype, 'close');
            trigger.setAttribute('data-o-overlay-modal', 'false');
            Overlay.init();
            
            o.fireEvent(trigger, 'click');
            
            o.fireEvent(document.querySelector('.o-overlay__close'), 'click');
            o.fireEvent(document.body, 'click');
            o.fireEvent(document.body, 'keyup', {
                keyCode: 27
            });
            o.fireCustomEvent(document.body, 'oLayers.new');

            expect(Overlay.prototype.close.calls.count()).toBe(4);

            var currentOverlay = Overlay.getOverlays()[0];
            currentOverlay.close = originalOverlayClose;
            currentOverlay.close();
        });

        it('should remove all traces on close', function() {
            var trigger = document.querySelector('.o-overlay-trigger');
            trigger.setAttribute('data-o-overlay-modal', 'false');
            Overlay.init();
            
            o.fireEvent(trigger, 'click');

            o.fireEvent(document.querySelector('.o-overlay__close'), 'click');

            expect(document.querySelectorAll('.o-overlay').length).toBe(0);

            Overlay.destroy();

            o.fireEvent(trigger, 'click');
            expect(document.querySelectorAll('.o-overlay').length).toBe(0);

            spyOn(Overlay.prototype, 'close');
            spyOn(Overlay.prototype, 'realign');
            spyOn(Overlay.prototype, 'resizeListener');
            spyOn(Overlay.prototype, 'closeOnExternalClick');
            spyOn(Overlay.prototype, 'closeOnEscapePress');
           
            o.fireCustomEvent(document.body, 'oViewport.resize');
            o.fireCustomEvent(document.body, 'oLayers.new');
            o.fireEvent(document.body, 'click');
            o.fireEvent(document.body, 'keyup');

            expect(Overlay.prototype.close).not.toHaveBeenCalled();
            expect(Overlay.prototype.realign).not.toHaveBeenCalled();
            expect(Overlay.prototype.resizeListener).not.toHaveBeenCalled();
            expect(Overlay.prototype.closeOnExternalClick).not.toHaveBeenCalled();
            expect(Overlay.prototype.closeOnEscapePress).not.toHaveBeenCalled();
  
        });



        it('should be possible to open and close imperatively', function() {
            var mod = new Overlay({
                html: testContent
            }, document.querySelector('.o-overlay-trigger'));

            var overlays = document.querySelectorAll('.o-overlay');
            
            expect(overlays.length).toBe(1);
            mod.close();
            overlays = document.querySelectorAll('.o-overlay');
            expect(overlays.length).toBe(0);
        });

    });


    it('should be able to inject content from template', function() {
        var scriptEl = document.createElement('script');
        scriptEl.id = 'test-overlay-content';
        scriptEl.setAttribute('type', 'text/template');
        scriptEl.innerHTML = "Test content";
        document.body.appendChild(scriptEl);
        
        var mod = new Overlay({
            src: '#test-overlay-content'
        }, document.querySelector('.o-overlay-trigger'));

        var overlays = document.querySelectorAll('.o-overlay');
        expect(overlays.length).toBe(1);
        mod.close();
        overlays = document.querySelectorAll('.o-overlay');
        expect(overlays.length).toBe(0);
        document.body.removeChild(scriptEl);
    });

    it('should be able to inject content from a url', function() {
        var mod = new Overlay({
            src: 'http://build.origami.ft.com/files/o-tweet@0.2.5/demos/demo.html'
        }, document.querySelector('.o-overlay-trigger'));

        var overlays = document.querySelectorAll('.o-overlay');
        expect(overlays.length).toBe(1);

        expect(mod.content.innerHTML).toContain('<div class="o-tweet__h-card">');

        mod.close();
        overlays = document.querySelectorAll('.o-overlay');
        expect(overlays.length).toBe(0);
    });
});