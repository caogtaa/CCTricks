/*
 * @Date: 2021-05-19 20:13:35
 * @LastEditors: GT<caogtaa@gmail.com>
 * @LastEditTime: 2021-05-19 21:35:01
 */

// target 默认指向 Componet 自定义组件
'use strict';

Vue.component('fft-texture-generator', {
  // 数组类型inspector定义方法:
  // https://forum.cocos.org/t/failed-to-regen-property-array-type-not-registered/49618/3
  template: `
    <ui-prop name="提取FFT">
      <ui-button class="green tiny" @confirm="onButtonClicked">ExtractFFT</ui-button>
    </ui-prop>
  `,

  props: {
    target: {
      twoWay: true,
      type: Object
    }
  },

  methods: {
    onButtonClicked:function() {
      let controller = cc.engine.getInstanceById(this.target.uuid.value);
      controller.HandleInspectorClick();
    }
  }
});
