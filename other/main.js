'use strict';
import { lib, game, ui, get, ai, _status } from "../../../noname.js";
import { gsElement } from "./gsElement.js";
/** @type { importExtensionConfig['precontent'] } */
async function PRECONTENT(config) {
	// 加载牌堆和角色
	if (lib.config.gs_forceEnableCard && lib.config.cards) lib.config.cards = ['原杀'];
	if (lib.config.gs_forceEnableCharacter && lib.config.characters) lib.config.characters = ['原杀'];
	//——————————————导入CSS文件——————————————//
	lib.init.css(`${lib.assetURL}extension/原杀/other`, `extension`);
	await gsElement();
	//——————————————导入武将、卡牌——————————————//
	await import('../asset/index.js')
}
async function CONTENT() {
	// 自动开启武将包
	if (!lib.config['extension_原杀_init']) {
		game.saveConfig('extension_原杀_init', true);
		game.saveConfig('characters', lib.config.characters.concat(['gsCharacter']))
		game.saveConfig('cards', lib.config.cards.concat(['gsCard']));
	};
	lib.translate.trick = '事件';
	lib.skill._gs_usable = {
		mod: {
			cardUsable(card, player, num) {
				if (!get.tag(card, 'damage') > 0) return;
				if (card.name == 'jiu') return;
				//低于上限随便用，高于上限不能用
				//写错 空闲 inp
				if (player.getHistory('useCard', (evt) => get.tag(evt.card, 'damage') && evt.isPhaseUsing()).length < (player.gs_countUsed() ?? 2)) return Infinity;
				return -Infinity;
			}
		}
	}
	// 势力导入，颜色与属性相同
	game.addGroup('mengde', '蒙德', '蒙德', { color: '#50dfdf' })
	game.addGroup('liyue', '璃月', '璃月', { color: '#ce9c13' })
	game.addGroup('daoqi', '稻妻', '稻妻', { color: '#af00a1' })
	game.addGroup('fengdan', '枫丹', '枫丹', { color: '#0066ff' })
	game.addGroup('xvmi', '须弥', '须弥', { color: '#197c00' })
	game.addGroup('nata', '纳塔', '纳塔', { color: '#ff9244' })
	game.addGroup('zhidong', '至冬', '至冬', { color: '#3b6273' })
}
const CONFIG = {
	splitLine: { clear: true, name: "<hr>" },
	elementPosition: {
		name: '<span class="bluetext">元素显示位置</span>',
		init: 'top',
		intro: '元素图标在武将牌附近的显示位置',
		item: {
			'top': '上',
			'bottom': '下',
			'left': '左',
			'right': '右',
		},
		onclick(item) {
			game.saveConfig('extension_原杀_elementPosition', item);
			if (game.countPlayer2() > 0) game.filterPlayer2(i => i.$syncElement())
		}
	},
	elementPosition2: {
		name: '<span class="bluetext">元素内外侧显示位置</span>',
		init: 'out',
		intro: '元素图标在武将牌内外的情况',
		item: {
			'in': '内侧',
			'on': '边缘',
			'out': '外侧',
		},
		onclick(item) {
			game.saveConfig('extension_原杀_elementPosition2', item);
			if (game.countPlayer2() > 0) game.filterPlayer2(i => i.$syncElement())
		}
	},
	splitLine2: { clear: true, name: "<hr>" },
	gs_forceEnableCharacter: {
		name: '仅启用本扩展角色包',
		intro: "开启后，会在游戏加载时强制仅启用本扩展角色包。这一行为会关闭其他角色包，仅保留本扩展角色，用于更好地体验本扩展的元素系统与角色。",
		init: false,
	},
	gs_forceEnableCard: {
		name: '仅启用本扩展卡牌包',
		init: false,
		intro: "开启后，会在游戏加载时强制仅启用本扩展卡牌包。这一行为会关闭其他卡牌包，仅保留本扩展卡牌，用于更好地体验本扩展牌堆。",
	},
	splitLine3: { clear: true, name: "<hr>" },
}
const HELP = {}
export { PRECONTENT, CONTENT, CONFIG, HELP };

