import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { Is } from '../../../noname/get';
type element = 'fire' | 'water' | 'wind' | 'thunder' | 'grass' | 'ice' | 'rock' | 'fire_grass' | 'thunder_grass' | 'water_ice' | 'water_grass';
type reactionType = '蒸发' | '融化' | '碎冰' | '超激化' | '蔓激化' | '扩散' | '超载' | '感电' | '超导' | '烈绽放' | '超绽放' | '燃烧' | '结晶' | '原绽放' | '冻结' | '原激化';
type reactionName = 'fire|water'
type elementObj = { element: Number }
declare module 'noname-typings/nonameModules/noname' {
	interface Game {
		/**设置卡牌/事件的元素
		 * -注意，元素会直接取代原有属性，无论是否addElement
		 * @param item 卡牌/事件
		 * @param elementObj 数组和单元素只能附加一层，附加多层请使用对象，默认{}
		 * @param addElement 保留旧元素？默认false
		 * @returns 
		 */
		setElement(item: Card | Event, elementObj?: element | [element] | { element: Number }, addElement?: Boolean): Object
	}
	interface Get {
		/**检测元素的级别
		 * @param element 属性
		 */
		level(element: element): '1' | '2' | undefined
		/**获取元素优先级的深拷贝(有序) */
		elementOrder(): [element]
		/**获取反应优先级的深拷贝(有序) */
		reactionOrder(): Map<element, reactionName>
		/**获取输入中可能进行的反应
		 * - 仅当下，无序，无重复
		 * - 拆散所有输入为元素，得到合法元素，然后输出结果
		 * @param element 反应名 参与元素 参与元素组
		 * @param toType 默认输出['fire|water']，选true输出反应类型 ['蒸发']
		 * @example
		 * get.reactionList('abc') = get.reactionList('abc|abc') = []//不合法输出[]
		 * get.reactionList('water|fire') = ['fire|water']//输入无序，也得到有序反应名
		 * get.reactionList(['fire', 'water']) = ['fire|water']//数组
		 * get.reactionList(['fire', 'water','abc']) = ['fire|water']//无视其中的不合法元素
		 * get.reactionList(['fire', 'water', 'fire|ice']) = ['fire|water', 'fire|ice', 'water|ice']//多元素得到所有反应
		 * get.reactionList('fire|water', true) = ['超载']//得到类型
		 * get.reactionList(['fire', 'water', 'ice'], true) = ['蒸发', '融化', '冻结']//多元素得到所有反应类型
		 * get.reactionList(['fire', 'water', 'fire_grass'], true) = ['燃烧', '融化']//无重复结果
		 */
		reactionList(element: reactionName | 'element|element' | [element], toType: Boolean): [reactionName] | [reactionType]
		/**返回特定元素对应的彩色字符串
		 * @param element 一个属性
		 * @param str 被改色的字符，默认是属性的翻译
		 * @example
		 * get.colorText('fire')=>'火'（红色的）
		 * get.colorText('fire','hhhh')=>'hhhh'（红色的）
		 */
		colorText(element: element, str?: String): String
		/**获取一个对象中的元素
		 * @param item 事物
		 */
		elementObj(item: Card | Event | any): elementObj
	}
	interface Player {
		/**角色的元素
		 * - 可以空调用一次，用来初始化角色的元素附着
		 * @param toType 返回类型x
		 * @example
		 * get.getElement('num')=>{fire: 3 }
		 * get.getElement('time')=>{fire: 2 }
		 * get.getElement('map')=>Map<fire, {num: 3, time: 2}>
		 * 默认返回：player.gs_element = {
		 *     fire: {
		 *         num: 3,//层数
		 *         time: 2,//持续值
		 *     },
		 * }
		 */
		getElementx(toType?: undefined | 'num' | 'time' | 'map'): {} | { element: { time: Number, num: Number } } | { element: Number } | Map<element, Player[]>
		/**统计角色的某元素附着量
		 * @param element
		 * get.countElement() => 0
		 * get.countElement('xxx') => 0
		 */
		countElement(element: element): Number
		/**统计某元素的当前持续值
		 * @param { element } element 元素
		 */
		countTime(element: element): Number
		/**角色拥有的元素组（有序）
		 * @param bool 只保留层数大于0的元素（排除视为附着）
		 * @returns { [element] }
		 */
		getElementList(bool: Boolean): [element]
		/**角色拥有某元素的附着
		 * @param element 
		 * @param bool 只保留层数大于0的元素（排除视为附着：附魔enchant）
		 * @example
		 * player.hasElement('fire')=>附着大于0的，和视为火附着的
		 * player.hasElement('fire',true)=>附着大于0的
		 */
		hasElement(element: element, bool: Boolean): Boolean
		/**判断玩家是否有元素共鸣
		 * @param element 元素
		 */
		hasResonance(element: element): Boolean
		/**可以共鸣（拥有指示物）
		 * @param element 
		 * @returns { Boolean }
		 */
		canResonance(element: element): Boolean
		/**返回角色使用伤害牌的次数上限
		 * 通过player.gs_countUsed参数进行设定
		 */
		countDamageUsed(): Number
		/**刷新一下元素显示
		 */
		$syncElement(): void
		/**播放冻结动画
		 * @param bool 冻结与否？默认当前water_ice的程度
		 */
		$hyyzBuff_dongjie(bool: Boolean): void
		/**改变使用伤害牌的上限
		 * @param num 改变的值
		 * @param expire 持续到……（默认永久）
		 */
		changeCountUsed(num: Number | 1, expire: SkillTrigger | SAAType<Signal> | undefined): Number
		/**改变持续值
		 * 改变After后，如果持续值归零会移除元素
		 * @param element 元素
		 * @param num 层数
		 */
		changeTime(element: element, num: Number | 1): GameEventPromise
	}
}
declare module 'noname-typings/nonameModules/noname/Get' {
	interface Is {
		/**检测这玩意是个元素
		 * @param element 元素
		 */
		element(element: element): Boolean
	}
}
