# 变电站黑盒报文视觉识别平台 Demo

这是一个纯前端静态演示，用来模拟以下链路：

- 多个变电站监控画面上的黑盒报文以不同速度刷新
- 中间层通过“CV / OCR”识别画面中的规约字段
- 左侧一次接线图节点状态与右侧结构化状态表同步更新
- 底部输出 SOE 风格的最近事件时间线

## 当前版本特点

- 页面风格调整为更正式的调控平台视觉
- 模拟字段参考 104 类规约常见元素：
  - `CA`
  - `IOA`
  - `TypeID`
  - `COT`
  - `QDS`
  - `CP56Time2a`
- 典型事件包含：
  - `M_DP_TB_1` 双点遥信变位
  - `M_ME_TF_1` 短浮点遥测变化

说明：
当前版本是“风格模拟 Demo”，不是逐字节精确复刻真实报文。
重点是验证视觉识别、状态映射、图表联动和多站点切换这条链路。

## 运行方式

直接打开 `index.html` 即可，也可以使用本地静态服务器：

```bash
cd /Users/mxw/Documents/codex/demo
python3 -m http.server 8080
```

然后访问 `http://localhost:8080`。

## 后续真实化方向

1. 将 `app.js` 中的报文生成器替换为真实截图采集。
2. 引入 ROI 标注，分区识别黑盒报文区、状态表区和图元区。
3. 接入 OCR 或 OpenCV 识别文本、颜色和图标状态。
4. 用统一事件总线管理 `站点-节点-状态-时间戳-质量位`。
5. 对接后端存储，沉淀 SOE、告警和回放能力。

## 公开资料参考

- [GB/T 18657.1-2002 远动设备及系统 第5部分:传输规约 第1篇:传输帧格式](https://openstd.samr.gov.cn/bzgk/gb/newGbInfo?hcno=0B2552FFD8C32703E4109A8FB0B13F3C)
- [GB/T 18657.3-2002 远动设备及系统 第5部分:传输规约 第3篇:应用数据的一般结构](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=1CD68F8302871D2C48AFFE47425388E3)
- [GB/T 18657.4-2002 远动设备及系统 第5部分:传输规约 第4篇:应用信息元素的定义和编码](https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=C59D7273506E7567E3107AE2E25A112C)
- [MZ Automation IEC 60870-5-101/104 Test Client 文档](https://support.mz-automation.de/doc/iec60870_test_client/latest/user_guide/user_guide.html)
- [ABB REC615 IEC 60870-5-101/104 Communication Protocol Manual](https://library.e.abb.com/public/f46ecc91c2154b54a9a653dea2525b4d/REC615_IEC101-104point_2NGA002479_ENa.pdf?x-sign=sIfP1q3N3Ysv2NjlKPsbdR2%2B6ZT8QdxuzbLMRDbvWpJb28qST7Hf13BO3SCz6I4A)

补充说明：
目前公开可直接访问的资料更容易拿到“标准框架、应用数据结构、TypeID 分类和地址字段说明”，不容易拿到国家电网某个具体生产系统的界面报文模板。
所以本 Demo 采用的是“符合 104 系列公开特征的行业风格模拟”。
