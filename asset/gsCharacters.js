import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { voices } from './voices.js';

const gsCharacters = {
	/** @type { importCharacterConfig['skill'] } */
	蒙德: {
		gs_lisha: ['丽莎', ['female', 'mengde', 3, ['gsmaichongdemonv', 'gsgaodengyuansulun'], []], get.colorText('thunder', '蔷薇魔女'), ''],
		gsmaichongdemonv: {
			nobracket: true,
			enable: 'phaseUse',
			usable: 1,
			filter(event, player) {
				return player.countCards('he');
			},
			filterCard: true,
			check(card) {
				return get.value(card) < 8 || get.color(card) == 'black' && get.type(card) != 'basic';
			},
			position: 'he',
			selectCard: [1, Infinity],
			async content(event, trigger, player) {
				let num = event.cards.length;
				if (event.cards.some(card => get.color(card) == 'black' && get.type(card) != 'basic')) {
					num++;
					player
						.when({ player: 'useCard1' })
						.filter((event, player) => !event.card.elementObj)
						.then(() => {
							game.setElement(trigger.card, 'thunder', true)
						})
				}
				await player.draw(num);
			},
			ai: {
				order: 10,
				result: {
					player(player, target, card) {
						return 1;
					},
				}
			}
		},
		gsgaodengyuansulun: {
			nobracket: true,
			trigger: {
				source: 'reactionBegin'
			},
			filter(event, player, name) {
				return event.source == player;
			},
			forced: true,
			async content(event, trigger, player) {
				let elements = trigger.reactionName.split(lib.natureSeparator);
				trigger.elementObj = {}
				trigger.elementObj[elements[0]] = trigger.elementObj[elements[1]] = 1;
			}
		},
		gsmaichongdemonv_info: `脉冲的魔女|阶段技，你可以弃置任意张牌，然后摸等量的牌。若因此弃置黑色非基本牌，则摸牌数+1，且使用的下一张无元素牌附加${get.colorText('thunder', '雷')}元素。`,
		gsgaodengyuansulun_info: '高等元素论|锁定技，你触发元素反应时，每种元素仅消耗1点。',
	},
	/** @type { importCharacterConfig['skill'] } */
	璃月: {
		gs_HuohuoTail: ['尾巴酱', ['male', 'liyue', 3, ['gszhuojian', 'gsdingji'], []]],//
		gszhuojian: {
			audio: "ext:原杀/asset/gs/audio:4",
			trigger: {
				player: ["useCardBefore", "shaBegin"],
				//source: "damageSource"
			},
			direct: true,
			filter(event, player) {
				switch (event.name) {
					case 'useCard': return (get.name(event.card) == 'sha') && !get.is.virtualCard(event.card)
					case 'damage': return event.card.name == 'sha' && event.getParent(2).name == "reaction"
					default: return true;
				}
			},
			async content(event, trigger, player) {
				switch (trigger.name) {
					case 'useCard':
						player.logSkill(event.name);
						trigger.card = get.autoViewAs({ name: get.name(trigger.card), isCard: true }, []);
						trigger.cards = trigger.card.cards = [];
						break;
					case 'damage':
						player.logSkill(event.name);
						player.useCard({ name: 'gs_dianshi' }, player);
						break;
					default:
						trigger.setContent(lib.skill.gszhuojian.shaContent);
						break;
				}
			},
			async shaContent(event, player, trigger) { event.target.reaction('fire|thunder', {}) },
			ai: {
				unequip: true,
				"unequip_ai": true,
				skillTagFilter(player, tag, arg) {
					return arg?.name == 'sha'
				},
			},
		},
		gsdingji: {
			audio: "ext:原杀/asset/gs/audio:2",
			mod: {
				enchant(player, result) {
					return (lib.nature.get(result) || 0) > (lib.nature.get('fire_grass') || 0) ? result : 'fire_grass'
				},
				resonance(player, result) {
					if (player.countCards('e') > 0) return (lib.nature.get(result) || 0) > (lib.nature.get('thunder') || 0) ? result : 'thunder'
				},
			},
		},
		gszhuojian_info: `灼见|锁定技，你声明使用的【杀】均为虚拟牌且效果改为“目标角色触发${get.colorText('fire', '火超载')}”。`,
		gsdingji_info: `鼎基|锁定技，你视为附着“${get.colorText('fire_grass')}”；你装备区内的牌视为${get.colorText('thunder')}共鸣指示物。`,
	},
	/** @type { importCharacterConfig['skill'] } */
	稻妻: {},
	/** @type { importCharacterConfig['skill'] } */
	须弥: {},
	/** @type { importCharacterConfig['skill'] } */
	枫丹: {},
	/** @type { importCharacterConfig['skill'] } */
	纳塔: {},
	/** @type { importCharacterConfig['skill'] } */
	至冬: {},
}
const gsdynamicTranslates = {}
export { gsCharacters, gsdynamicTranslates }