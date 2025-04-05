import { lib, game, ui, get, ai, _status } from '../../../noname.js';
import { voices } from './voices.js';

/** @type { importCharacterConfig } */
export const gsCharacters = {
	character: {
		gs_lisha: ['female', 'mengde', 3, ['gs_maichongdemonv', 'gs_gaodengyuansulun', 'gs_test3'], ['ext:原杀/asset/gs/image/gs_lisha.jpg']]
	},
	characterIntro: {},
	characterTitle: {
		get gs_lisha() {
			return get.gs_colorText('thunder', '蔷薇魔女')
		}
	},
	skill: {
		//丽莎
		gs_maichongdemonv: {
			nobracket: true,
			enable: 'phaseUse',
			usable: 1,
			filter(event, player) {
				return player.countCards('he');
			},
			filterCard: true,
			check(card) {
				if (get.value(card) > 8) return false;
				if (!ui.selected.cards.length) return get.color(card) == 'black' && get.type(card) != 'basic';
				return true;
			},
			position: 'he',
			selectCard: [1, Infinity],
			async content(event, trigger, player) {
				let num = event.cards.length;
				if (event.cards.some(card => get.color(card) == 'black' && get.type(card) != 'basic')) {
					num++;
					player
						.when({ player: 'useCard' })
						.filter((event, player) => !event.card.elementObj && !get.tag(event.card, 'gs_element'))
						.then(() => {
							game.setElement(trigger.card, 'thunder')
						})
				}
				await player.draw(num);
			},
			ai: {
				order: 1,
				result: {
					player(player, target, card) {
						return 1;
					},
				}
			}
		},
		gs_gaodengyuansulun: {
			nobracket: true,
			trigger: {
				source: 'reactionBegin'
			},
			filter(event, player, name) {
				return event.source == player;
			},
			forced: true,
			async content(event, trigger, player) {
				let elements = trigger.gs_name.split(lib.natureSeparator);
				trigger.elementObj = {}
				trigger.elementObj[elements[0]] = trigger.elementObj[elements[1]] = 1;
			}
		},

	},
	characterSort: {},
	translate: {
		...voices,
		gs_lisha: '丽莎',
		gs_maichongdemonv: '脉冲的魔女',
		get gs_maichongdemonv_info() {
			return `阶段技，你可以弃置任意张牌，然后摸等量的牌。若因此弃置黑色非基本牌，则摸牌数+1，且使用的下一张无元素牌附加${get.gs_colorText('thunder', '雷')}元素。`
		},
		gs_gaodengyuansulun: '高等元素论',
		gs_gaodengyuansulun_info: '锁定技，你触发元素反应时，每种元素仅消耗1点。',

	},
}
