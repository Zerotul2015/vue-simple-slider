import smoothscroll from 'smoothscroll-polyfill';

//
smoothscroll.polyfill();
var script = {
  name: "VueSimpleSlider",
  props: {
    /**
     * items to display in horizontal-list
     */
    items: {
      type: Array,
      required: true
    },

    /**
     * item.class = css class for each individual item
     * item.padding = padding between each item in the list
     *
     * list.class = css class for the parent of item
     * list.windowed = maximum width of the list it can extend to, basically the container max-width
     * list.padding = padding of the list, if container < windowed what is the left-right padding of the list
     *
     * responsive breakpoints to calculate how many items to show in the list at each width interval
     * Examples:
     * [{size: 5}] show 5 items regardless
     * [{end: 992, size: 3}},{size: 4}] < 992 show 3 items, else show 4 items
     * [{end: 576, size: 1}, {start: 576, end: 992, size: 2}, {size: 3}] < 576 show 1, 576 - 992 show 2, else show 3
     *
     * These are the default responsive fallback, if you don't have a catch all, it will fallback to this.
     * [{end: 576, size: 1},
     * {start: 576, end: 768, size: 2},
     * {start: 768, end: 992, size: 3},
     * {start: 992, end: 1200, size: 4},
     * {start: 1200, size: 5}]
     *
     *
     * Auto change next slider
     * autoplay: {
     * enable/disable playing slideshow
     *  play: true,
     *  the delay duration between slides in milliseconds
     * speed: 1800,
     * if setup, the slideshow will be in the loop.
     * repeat: true,
     * }
     *
     */
    options: {
      type: Object,
      required: false
    }
  },

  data() {
    return {
      /**
       * Current item position of list
       */
      position: 0,

      /**
       * Width of item, list and window
       */
      width: {
        container: 0,
        window: 576
      },

      /**
       * Debounce timer of the scroll
       */
      scrollTimer: null,

      /**
       * Interval of the autoPlay
       */
      autoPlayInterval: null
    };
  },

  mounted() {
    this.$resize = () => {
      this.width.window = window.innerWidth;
      this.width.container = this.$refs.container.clientWidth;
    };

    this.$resize();
    window.addEventListener('resize', this.$resize);

    if (this._options.position.start) {
      this.$nextTick(() => {
        this.go(this._options.position.start);
      });
    }

    if (this._options.autoplay.play) {
      this.runAutoPlay();
    }
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.$resize);

    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  },

  computed: {
    _items() {
      return [...(this.$slots["start"] ? [{
        type: "start"
      }] : []), ...this.items.map(value => ({
        type: "item",
        item: value
      })), ...(this.$slots["end"] ? [{
        type: "end"
      }] : [])];
    },

    _length() {
      return this._items.length;
    },

    _options() {
      const options = this.options;
      let responsive1 = {
        end: 576,
        size: 1
      };
      let responsive2 = {
        start: 576,
        end: 768,
        size: 2
      };
      let responsive3 = {
        start: 768,
        end: 992,
        size: 3
      };
      let responsive4 = {
        start: 992,
        end: 1200,
        size: 4
      };
      let responsive5 = {
        start: 1200,
        size: 5
      };

      if (this.items.length < 5 && this.items.length) {
        responsive5.size = this.items.length;

        if (responsive5.size > responsive4.size) {
          responsive4.size = responsive5.size - 1;
        } else {
          responsive4.size = responsive5.size;
        }

        if (responsive4.size > responsive3.size) {
          responsive3.size = responsive4.size - 1;
        } else {
          responsive3.size = responsive4.size;
        }

        if (responsive3.size > responsive2.size) {
          responsive2.size = responsive3.size - 1;
        } else {
          responsive2.size = responsive3.size;
        }
      }

      return {
        navigation: {
          start: options && options.navigation && options.navigation.start || 992,
          color: options && options.navigation && options.navigation.color || '#000'
        },
        item: {
          class: options && options.item && options.item.class || '',
          padding: options && options.item && options.item.padding || 16
        },
        list: {
          class: options && options.list && options.list.class || '',
          windowed: options && options.list && options.list.windowed || 1200,
          padding: options && options.list && options.list.padding || 24
        },
        responsive: [...(options && options.responsive || []), // Fallback default responsive
        responsive1, responsive2, responsive3, responsive4, responsive5],
        position: {
          start: options?.position?.start ?? 0
        },
        autoplay: {
          play: options?.autoplay?.play ?? false,
          speed: options?.autoplay?.speed ?? 2000,
          repeat: options?.autoplay?.repeat ?? false
        }
      };
    },

    _style() {
      const style = {
        container: {},
        list: {},
        item: {},
        tail: {}
      };
      const workingWidth = this._workingWidth;
      const size = this._size; // Full Screen Mode

      if (this.width.window < this._options.list.windowed) {
        style.container.marginLeft = `-${this._options.list.padding}px`;
        style.container.marginRight = `-${this._options.list.padding}px`;
        style.item.width = `${(workingWidth - (size - 1) * this._options.item.padding) / size}px`;
        style.item.paddingLeft = `${this._options.list.padding}px`;
        style.item.paddingRight = `${this._options.item.padding}px`;
        style.item.marginRight = `-${this._options.list.padding}px`;
      } // Windowed Mode
      else {
          style.item.paddingLeft = `${this._options.item.padding / 2}px`;
          style.item.paddingRight = `${this._options.item.padding / 2}px`;
          style.container.marginLeft = `-${this._options.item.padding / 2}px`;
          style.container.marginRight = `-${this._options.item.padding / 2}px`;
          style.item.width = `${(workingWidth - (size - 1) * this._options.item.padding) / size}px`;
        }

      return style;
    },

    _itemWidth() {
      return (this._workingWidth - (this._size - 1) * this._options.item.padding) / this._size;
    },

    /**
     * @return number actual width of the container
     */
    _workingWidth() {
      // Full Screen Mode
      if (this.width.window < this._options.list.windowed) {
        return this.width.window - this._options.list.padding * 2;
      } // Windowed Mode
      else {
          return this.width.container;
        }
    },

    /**
     * @return visible items in horizontal list at the current width/state
     */
    _size() {
      const width = this._workingWidth;
      return this._options.responsive.find(value => {
        return (!value.start || value.start <= width) && (!value.end || value.end >= width);
      }).size;
    },

    /**
     * @return boolean whether there is prev set of items for navigation
     * @private internal use
     */
    _hasNext() {
      return this.items.length > this.position + this._size;
    },

    /**
     * @return boolean whether there is next set of items for navigation
     * @private internal use
     */
    _hasPrev() {
      return this.position > 0;
    }

  },
  watch: {
    "options.autoplay.play": function (newVal, oldVal) {
      if (!newVal) {
        this.stopAutoPlay();
      } else {
        this.runAutoPlay();
      }
    }
  },
  methods: {
    /**
     * @param position of item to scroll to
     */
    go(position) {
      const maxPosition = this.items.length - this._size;
      this.position = position > maxPosition ? maxPosition : position;
      const left = this._itemWidth * this.position + this.position * this._options.item.padding;
      this.$refs.list.scrollTo({
        top: 0,
        left: left,
        behavior: 'smooth'
      });
    },

    /**
     * Run autoPlay slide show
     */
    runAutoPlay() {
      this.autoPlayInterval = setInterval(function () {
        if (this._options.autoplay.repeat && this.position === this._length - this._size) {
          this.position = 0;
          this.go(this.position);
        } else {
          this.position += 1;
          this.go(this.position);
        }
      }.bind(this), this._options.autoplay.speed);
    },

    /**
     * Stop autoPlay slide show
     */
    stopAutoPlay() {
      clearInterval(this.autoPlayInterval);
    },

    /**
     * Go to a set of previous items
     */
    prev() {
      this.go(this.position - this._size);
    },

    /**
     * Go to a set of next items
     */
    next() {
      this.go(this.position + this._size);
    },

    /**
     * On horizontal scroll re-evaluate the actual position
     */
    scrollHandler() {
      clearTimeout(this.scrollTimer); //Renew timer

      this.scrollTimer = setTimeout(function () {
        const parentLeftOffset = this.$refs["list"].getBoundingClientRect().left;

        let items = this._items.map((item, index) => {
          const itemLeftOffset = this.$refs.item[index].getBoundingClientRect().left;
          return Math.abs(itemLeftOffset - parentLeftOffset);
        });

        this.position = items.indexOf(Math.min(...items));
      }.bind(this), 50);
    }

  }
};

function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
    if (typeof shadowMode !== 'boolean') {
        createInjectorSSR = createInjector;
        createInjector = shadowMode;
        shadowMode = false;
    }
    // Vue.extend constructor export interop.
    const options = typeof script === 'function' ? script.options : script;
    // render functions
    if (template && template.render) {
        options.render = template.render;
        options.staticRenderFns = template.staticRenderFns;
        options._compiled = true;
        // functional template
        if (isFunctionalTemplate) {
            options.functional = true;
        }
    }
    // scopedId
    if (scopeId) {
        options._scopeId = scopeId;
    }
    let hook;
    if (moduleIdentifier) {
        // server build
        hook = function (context) {
            // 2.3 injection
            context =
                context || // cached call
                    (this.$vnode && this.$vnode.ssrContext) || // stateful
                    (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
            // 2.2 with runInNewContext: true
            if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                context = __VUE_SSR_CONTEXT__;
            }
            // inject component styles
            if (style) {
                style.call(this, createInjectorSSR(context));
            }
            // register component module identifier for async chunk inference
            if (context && context._registeredComponents) {
                context._registeredComponents.add(moduleIdentifier);
            }
        };
        // used by ssr in case component is cached and beforeCreate
        // never gets called
        options._ssrRegister = hook;
    }
    else if (style) {
        hook = shadowMode
            ? function (context) {
                style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
            }
            : function (context) {
                style.call(this, createInjector(context));
            };
    }
    if (hook) {
        if (options.functional) {
            // register for functional component in vue file
            const originalRender = options.render;
            options.render = function renderWithStyleInjection(h, context) {
                hook.call(context);
                return originalRender(h, context);
            };
        }
        else {
            // inject component registration as beforeCreate hook
            const existing = options.beforeCreate;
            options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
        }
    }
    return script;
}

const isOldIE = typeof navigator !== 'undefined' &&
    /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
function createInjector(context) {
    return (id, style) => addStyle(id, style);
}
let HEAD;
const styles = {};
function addStyle(id, css) {
    const group = isOldIE ? css.media || 'default' : id;
    const style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
    if (!style.ids.has(id)) {
        style.ids.add(id);
        let code = css.source;
        if (css.map) {
            // https://developer.chrome.com/devtools/docs/javascript-debugging
            // this makes source maps inside style tags work properly in Chrome
            code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
            // http://stackoverflow.com/a/26603875
            code +=
                '\n/*# sourceMappingURL=data:application/json;base64,' +
                    btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                    ' */';
        }
        if (!style.element) {
            style.element = document.createElement('style');
            style.element.type = 'text/css';
            if (css.media)
                style.element.setAttribute('media', css.media);
            if (HEAD === undefined) {
                HEAD = document.head || document.getElementsByTagName('head')[0];
            }
            HEAD.appendChild(style.element);
        }
        if ('styleSheet' in style.element) {
            style.styles.push(code);
            style.element.styleSheet.cssText = style.styles
                .filter(Boolean)
                .join('\n');
        }
        else {
            const index = style.ids.size - 1;
            const textNode = document.createTextNode(code);
            const nodes = style.element.childNodes;
            if (nodes[index])
                style.element.removeChild(nodes[index]);
            if (nodes.length)
                style.element.insertBefore(textNode, nodes[index]);
            else
                style.element.appendChild(textNode);
        }
    }
}

/* script */
const __vue_script__ = script;
/* template */

var __vue_render__ = function () {
  var _vm = this;

  var _h = _vm.$createElement;

  var _c = _vm._self._c || _h;

  return _c('div', {
    ref: "container",
    staticClass: "vue-simple-slider vhl-btn-right--list"
  }, [_vm.width.window > _vm._options.navigation.start ? _c('div', {
    staticClass: "vhl-navigation"
  }, [_vm._hasPrev ? _c('div', {
    staticClass: "vhl-btn-left vhl-btn-left-custom",
    on: {
      "click": _vm.prev
    }
  }, [_vm._t("nav-prev", [_c('svg', {
    attrs: {
      "fill": _vm._options.navigation.color,
      "width": "32px",
      "height": "32px",
      "viewBox": "0 0 24 24"
    }
  }, [_c('path', {
    attrs: {
      "d": "M10.757 12l4.95 4.95a1 1 0 1 1-1.414 1.414l-5.657-5.657a1 1 0 0 1 0-1.414l5.657-5.657a1 1 0 0 1 1.414 1.414L10.757 12z"
    }
  })])])], 2) : _vm._e(), _vm._v(" "), _vm._hasNext ? _c('div', {
    staticClass: "vhl-btn-right vhl-btn-right-custom",
    on: {
      "click": _vm.next
    }
  }, [_vm._t("nav-next", [_c('svg', {
    attrs: {
      "fill": _vm._options.navigation.color,
      "width": "32px",
      "height": "32px",
      "viewBox": "0 0 24 24"
    }
  }, [_c('path', {
    attrs: {
      "d": "M13.314 12.071l-4.95-4.95a1 1 0 0 1 1.414-1.414l5.657 5.657a1 1 0 0 1 0 1.414l-5.657 5.657a1 1 0 0 1-1.414-1.414l4.95-4.95z"
    }
  })])])], 2) : _vm._e()]) : _vm._e(), _vm._v(" "), _c('div', {
    staticClass: "vhl-container",
    style: _vm._style.container
  }, [_c('div', {
    ref: "list",
    staticClass: "vhl-list",
    class: _vm._options.list.class,
    style: _vm._style.list,
    on: {
      "scroll": _vm.scrollHandler
    }
  }, [_vm._l(_vm._items, function (item) {
    return _c('div', {
      ref: "item",
      refInFor: true,
      staticClass: "vhl-item",
      class: _vm._options.item.class,
      style: _vm._style.item
    }, [item.type === 'start' ? _vm._t("start") : item.type === 'end' ? _vm._t("end") : item.type === 'item' ? _vm._t("default", [_vm._v(_vm._s(item) + "\n        ")], {
      "item": item.item
    }) : _vm._e()], 2);
  }), _vm._v(" "), _c('div', {
    style: _vm._style.tail
  })], 2)])]);
};

var __vue_staticRenderFns__ = [];
/* style */

const __vue_inject_styles__ = function (inject) {
  if (!inject) return;
  inject("data-v-afbb94e4_0", {
    source: ".vue-simple-slider[data-v-afbb94e4]{position:relative}.vhl-navigation[data-v-afbb94e4]{display:flex;align-items:center;position:absolute;width:100%;height:100%}.vhl-btn-left[data-v-afbb94e4],.vhl-btn-right[data-v-afbb94e4]{width:48px;height:48px;display:flex;align-items:center;justify-content:center;border-radius:24px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12),0 1px 2px rgba(0,0,0,.24);z-index:2}.vhl-btn-left[data-v-afbb94e4]:hover,.vhl-btn-right[data-v-afbb94e4]:hover{cursor:pointer}.vhl-btn-left[data-v-afbb94e4]{margin-left:-24px;margin-right:auto}.vhl-btn-right[data-v-afbb94e4]{margin-left:auto;margin-right:-24px}.vhl-container[data-v-afbb94e4]{overflow-y:hidden;height:100%;margin-bottom:-24px}.vhl-list[data-v-afbb94e4]{display:flex;padding-bottom:24px;margin-bottom:-24px;overflow-x:scroll;overflow-y:hidden;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory}.vhl-item[data-v-afbb94e4]{box-sizing:content-box}.vhl-list>*[data-v-afbb94e4]{scroll-snap-align:start;flex-shrink:0}.vhl-item[data-v-afbb94e4]{z-index:1}",
    map: undefined,
    media: undefined
  });
};
/* scoped */


const __vue_scope_id__ = "data-v-afbb94e4";
/* module identifier */

const __vue_module_identifier__ = undefined;
/* functional template */

const __vue_is_functional_template__ = false;
/* style inject SSR */

/* style inject shadow dom */

const __vue_component__ = /*#__PURE__*/normalizeComponent({
  render: __vue_render__,
  staticRenderFns: __vue_staticRenderFns__
}, __vue_inject_styles__, __vue_script__, __vue_scope_id__, __vue_is_functional_template__, __vue_module_identifier__, false, createInjector, undefined, undefined);

// Import vue component

const install = function (Vue) {
  if (install.installed) return;
  install.installed = true;
  Vue.component('VueSimpleSlider', __vue_component__);
}; // Create module definition for Vue.use()


const plugin = {
  install
}; // To auto-install when vue is found
// eslint-disable-next-line no-redeclare

/* global window, global */

let GlobalVue = null;

if (typeof window !== 'undefined') {
  GlobalVue = window.Vue;
} else if (typeof global !== 'undefined') {
  GlobalVue = global.Vue;
}

if (GlobalVue) {
  GlobalVue.use(plugin);
} // Inject install function into component - allows component
// to be registered via Vue.use() as well as Vue.component()


__vue_component__.install = install; // Export component by default
// also be used as directives, etc. - eg. import { RollupDemoDirective } from 'rollup-demo';
// export const RollupDemoDirective = component;

export default __vue_component__;
