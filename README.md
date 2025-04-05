原杀更新日志

# 2025/3/30 开发中版本
更新者：尾巴酱
1. 更新了原杀的架构
2. 大量重写函数
3. 添加丽莎、点石成金、驱散的无图版本

# 2025/4/4 开发中版本
更新者：尾巴酱
# 截至目前
1. 护盾部分的代码改为异步
2. 用lib.gs保存本系统涉及到的库参数。
- elementOrder：元素优先级，有序
- reactionOrder：反应优先级，有序
- reactionList：基于反应优先级的反应名/类优先级，有序
- reactionCost：元素反应消耗，无序
- reactionContent：元素反应效果，无序
3. lib.nature添加十一种属性；函数生成反应名的翻译即为对应的反应类
4. 用lib.skill写系统中自动运行的机制。
- gs_element：标记显示
- _gs_Auto：附着后自动触发反应、自然衰减导致的持续值降低、持续值归零后移除元素、伤害与牌的自动元素附着
- _gs_secondElement：二级元素的效果
- _gs_buff：元素共鸣的效果
5. 用game执行系统操作的事件
- setElement：设置卡牌/事件的元素附着属性elementObj
6. 用get.is检测输入是否满足条件
- gs_element：检测输入是否是一个元素
7. 用get获取一些属性/值
- gs_level：获取输入元素的级别
- gs_elements：获取库元素的有序浅拷贝
- gs_reactionList：获取输入元素中能够进行的反应名/类
- gs_colorText：获取字符串在指定元素颜色影响下的字符串
8. 用lib.element.player执行角色函数/触发事件
- gs_getElement：获取角色的元素持续值/元素量/Map
- gs_getElementList：获取角色层数大于0的元素组，有序
- gs_countElement：获取角色的输入元素的附着量
- gs_hasElement：角色是否拥有输入元素的附着
- gs_hasBuff：角色是否有输入元素的共鸣
- gs_countUsed：角色可使用伤害牌的次数上限
- $syncElement：刷新角色的系统效果显示
- gainElement：事件：获得一组元素附着
- removeElement：事件：移除一组元素附着
- reactionAuto：事件：执行一组元素反应
- changeTime：事件：改变持续值
- $hyyzBuff_dongjie：播放冻结动画
9. 用lib.element.content执行事件
- gainElement：事件：获得一组元素附着
- gainElementTo：事件：获得指定元素附着
- removeElement：事件：移除一组元素附着
- removeElementTo：事件：移除指定元素附着
- reactionAuto：事件：执行一组元素反应
- reaction：事件：执行指定元素反应
- changeTime：事件：改变持续值
- phaseLoop：覆盖源码，增加回合切换时的时机
10. 启动代码：开启选项的情况下仅开始原杀扩卡牌和武将，导入css文件，导入元素反应系统模块，导入角色和卡牌模块
11. 主代码：导入扩展后自动开启武将包，“锦囊”类改为“事件”类，规则由“出牌阶段的空闲时间点至多使用一张杀”改为“出牌阶段的空闲时间点至多使用两张伤害牌”，导入七国势力
12. 武将：目前有丽莎，卡牌：目前有示、疗、飙、饺、点石成金、驱散、西风剑。武将与卡牌暂未进行测试。
13. 文件方面，已导入所有元素的UI图标
