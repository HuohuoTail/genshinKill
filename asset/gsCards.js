'use strict';
import { lib, game, ui, get, ai, _status } from '../../../noname.js';
//技能等相关信息
/** @type { importCardConfig } */
const gsCards = {
	card: {
		...{//基本牌
			gs_shenyv_info: ['神谕',
				'出牌阶段，对自己使用。目标角色亮出牌堆顶两张牌，然后获得其中一类非基本牌。',
				'理'],
			gs_shenyv: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				filterTarget: lib.filter.isMe,
				selectTarget: -1,
				async content(event, trigger, player) {
					const target = event.targets[0], card = event.card;
					let result;
					if (event.directHit || event.directHit2 || (!_status.connectMode && lib.config.skip_shan && !target.hasShan())) {
						result = { bool: false };
					} else if (event.skipShan) {
						result = { bool: true, result: "shaned" };
					} else {
						const next = target.chooseToUse("请使用一张闪响应神谕");
						next.set("type", "respondShan");
						next.set("filterCard", function (card, player) {
							if (get.name(card) != "shan") return false;
							return lib.filter.cardEnabled(card, player, "forceEnable");
						});
						next.set("ai1", function (card) {
							return false;
							return 0;
						})
						next.set("respondTo", [player, card]);
						//next.autochoose=lib.filter.autoRespondShan;
						result = await next.forResult();
					}
					if (!result || !result.bool || !result.result || result.result != "shaned") {
						if (!event.directHit && !event.directHit2 && lib.filter.cardEnabled(new lib.element.VCard({ name: "shan" }), target, "forceEnable") && target.countCards("hs") > 0 && get.damageEffect(target, player, target) < 0)
							target.addGaintag(target.getCards("hs"), "sha_notshan");

						const cards = get.cards(2), types = []
						target.showCards(cards, '因【神谕】展示');
						cards.forEach(card => {
							if (get.type2(card) != 'basic') types.add(get.type2(card))
						});
						if (types.length > 0) {
							const control = await target.chooseControl(types).set('prompt', '获得其中的一类非基本牌').forResultControl();
							if (control) {
								await target.gain(cards.filter(card => get.type2(card) == control))
							}
						}
					}
				},
				/**@type { SkillAI } */
				ai: {
					basic: {
						order: 7,
						useful: (card, i) => {
							return 1.5
						},
						value: (card, player) => {
							return 9.2
						},
					},
					result: {
						target: 1,
					},
					tag: {
						draw: 1.5,
					},
				},
			},
			gs_ciai_info: ['慈爱',
				'①出牌阶段，对自己使用，目标角色回复1点体力。②当有角色处于濒死状态时，对该角色使用。目标角色回复1点体力。',
				'生'],
			gs_ciai: {
				fullskin: true,
				type: "basic",
				//cardcolor: "red",
				toself: true,
				enable(card, player) {
					return player.isDamaged();
				},
				savable: true,
				selectTarget: -1,
				filterTarget(card, player, target) {
					return target == player && target.isDamaged();
				},
				modTarget(card, player, target) {
					return target.isDamaged();
				},
				async content(event, trigger, player) {
					const target = event.targets[0], card = event.card;
					let result;
					if (event.directHit || event.directHit2 || (!_status.connectMode && lib.config.skip_shan && !target.hasShan())) {
						result = { bool: false };
					} else if (event.skipShan) {
						result = { bool: true, result: "shaned" };
					} else {
						const next = target.chooseToUse("请使用一张闪响应慈爱");
						next.set("type", "respondShan");
						next.set("filterCard", function (card, player) {
							if (get.name(card) != "shan") return false;
							return lib.filter.cardEnabled(card, player, "forceEnable");
						});
						next.set("ai1", function (card) {
							return false;
							return 0;
						})
						next.set("respondTo", [player, card]);
						//next.autochoose=lib.filter.autoRespondShan;
						result = await next.forResult();
					}
					if (!result || !result.bool || !result.result || result.result != "shaned") {
						if (!event.directHit && !event.directHit2 && lib.filter.cardEnabled(new lib.element.VCard({ name: "shan" }), target, "forceEnable") && target.countCards("hs") > 0 && get.damageEffect(target, player, target) < 0)
							target.addGaintag(target.getCards("hs"), "sha_notshan");

						await target.recover();
					}
				},
				ai: {
					basic: {
						order: (card, player) => {
							if (player.hasSkillTag("pretao")) return 9;
							return 2;
						},
						useful: (card, i) => {
							let player = _status.event.player;
							if (!game.checkMod(card, player, "unchanged", "cardEnabled2", player))
								return 2 / (1 + i);
							let fs = game.filterPlayer((current) => {
								return get.attitude(player, current) > 0 && current.hp <= 2;
							}),
								damaged = 0,
								needs = 0;
							fs.forEach((f) => {
								if (f.hp > 3 || !lib.filter.cardSavable(card, player, f)) return;
								if (f.hp > 1) damaged++;
								else needs++;
							});
							if (needs && damaged) return 5 * needs + 3 * damaged;
							if (needs + damaged > 1 || player.hasSkillTag("maixie")) return 8;
							if (player.hp / player.maxHp < 0.7)
								return 7 + Math.abs(player.hp / player.maxHp - 0.5);
							if (needs) return 7;
							if (damaged) return Math.max(3, 7.8 - i);
							return Math.max(1, 7.2 - i);
						},
						value: (card, player) => {
							let fs = game.filterPlayer((current) => {
								return get.attitude(_status.event.player, current) > 0;
							}),
								damaged = 0,
								needs = 0;
							fs.forEach((f) => {
								if (!player.canUse("gs_ciai", f)) return;
								if (f.hp <= 1) needs++;
								else if (f.hp == 2) damaged++;
							});
							if ((needs && damaged) || player.hasSkillTag("maixie"))
								return Math.max(9, 5 * needs + 3 * damaged);
							if (needs || damaged > 1) return 8;
							if (damaged) return 7.5;
							return Math.max(5, 9.2 - player.hp);
						},
					},
					result: {
						target: (player, target) => {
							if (target.hasSkillTag("maixie")) return 3;
							return 2;
						},
						target_use: (player, target, card) => {
							let mode = get.mode(),
								gs_ciais = player.getCards(
									"hs",
									(i) =>
										get.name(i) === "gs_ciai" &&
										lib.filter.cardEnabled(i, target, "forceEnable")
								);
							if (target !== _status.event.dying) {
								if (
									!player.isPhaseUsing() ||
									player.needsToDiscard(0, (i, player) => {
										return (
											!player.canIgnoreHandcard(i) &&
											gs_ciais.includes(i)
										);
									}) ||
									player.hasSkillTag(
										"nokeep",
										true,
										{
											card: card,
											target: target,
										},
										true
									)
								)
									return 2;
								let min = 8.1 - (4.5 * player.hp) / player.maxHp,
									nd = player.needsToDiscard(0, (i, player) => {
										return (
											!player.canIgnoreHandcard(i) &&
											(gs_ciais.includes(i) || get.value(i) >= min)
										);
									}),
									keep = nd ? 0 : 2;
								if (
									nd > 2 ||
									(gs_ciais.length > 1 && (nd > 1 || (nd && player.hp < 1 + gs_ciais.length))) ||
									(target.identity === "zhu" &&
										(nd || target.hp < 3) &&
										(mode === "identity" || mode === "versus" || mode === "chess")) ||
									!player.hasFriend()
								)
									return 2;
								if (
									game.hasPlayer((current) => {
										return (
											player !== current &&
											current.identity === "zhu" &&
											current.hp < 3 &&
											(mode === "identity" || mode === "versus" || mode === "chess") &&
											get.attitude(player, current) > 0
										);
									})
								)
									keep = 3;
								else if (nd === 2 || player.hp < 2) return 2;
								if (nd === 2 && player.hp <= 1) return 2;
								if (keep === 3) return 0;
								if (gs_ciais.length <= player.hp / 2) keep = 1;
								if (
									keep &&
									game.countPlayer((current) => {
										if (
											player !== current &&
											current.hp < 3 &&
											player.hp > current.hp &&
											get.attitude(player, current) > 2
										) {
											keep += player.hp - current.hp;
											return true;
										}
										return false;
									})
								) {
									if (keep > 2) return 0;
								}
								return 2;
							}
							if (target.isZhu2() || target === game.boss) return 2;
							if (player !== target) {
								if (target.hp < 0 && gs_ciais.length + target.hp <= 0) return 0;
								if (Math.abs(get.attitude(player, target)) < 1) return 0;
							}
							if (!player.getFriends().length) return 2;
							let tri = _status.event.getTrigger(),
								num = game.countPlayer((current) => {
									if (get.attitude(current, target) > 0)
										return current.countCards(
											"hs",
											(i) =>
												get.name(i) === "gs_ciai" &&
												lib.filter.cardEnabled(i, target, "forceEnable")
										);
								}),
								dis = 1,
								t = _status.currentPhase || game.me;
							while (t !== target) {
								let att = get.attitude(player, t);
								if (att < -2) dis++;
								else if (att < 1) dis += 0.45;
								t = t.next;
							}
							if (mode === "identity") {
								if (tri && tri.name === "dying") {
									if (target.identity === "fan") {
										if (
											(!tri.source && player !== target) ||
											(tri.source &&
												tri.source !== target &&
												player.getFriends().includes(tri.source.identity))
										) {
											if (
												num > dis ||
												(player === target &&
													player.countCards("hs", { type: "basic" }) > 1.6 * dis)
											)
												return 2;
											return 0;
										}
									} else if (
										tri.source &&
										tri.source.isZhu &&
										(target.identity === "zhong" || target.identity === "mingzhong") &&
										(tri.source.countCards("he") > 2 ||
											(player === tri.source &&
												player.hasCard((i) => i.name !== "gs_ciai", "he")))
									)
										return 2;
									//if(player!==target&&!target.isZhu&&target.countCards('hs')<dis) return 0;
								}
								if (player.identity === "zhu") {
									if (
										player.hp <= 1 &&
										player !== target &&
										gs_ciais + player.countCards("hs", "jiu") <=
										Math.min(
											dis,
											game.countPlayer((current) => {
												return current.identity === "fan";
											})
										)
									)
										return 0;
								}
							} else if (
								mode === "stone" &&
								target.isMin() &&
								player !== target &&
								tri &&
								tri.name === "dying" &&
								player.side === target.side &&
								tri.source !== target.getEnemy()
							)
								return 0;
							return 2;
						},
					},
					tag: {
						recover: 1,
						save: 1,
					},
				},
			},
			gs_liefeng_info: ['烈风',
				'出牌阶段，对自己或攻击范围内一名角色使用。目标角色摸两张牌并翻面。',
				'时'],
			gs_liefeng: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				range(card, player, target) {
					return player == target || player.inRange(target);
				},
				filterTarget: true,
				async content(event, trigger, player) {
					const target = event.targets[0], card = event.card;
					let result;
					if (event.directHit || event.directHit2 || (!_status.connectMode && lib.config.skip_shan && !target.hasShan())) {
						result = { bool: false };
					} else if (event.skipShan) {
						result = { bool: true, result: "shaned" };
					} else {
						const next = target.chooseToUse("请使用一张闪响应烈风");
						next.set("type", "respondShan");
						next.set("filterCard", function (card, player) {
							if (get.name(card) != "shan") return false;
							return lib.filter.cardEnabled(card, player, "forceEnable");
						});
						next.set("ai1", function (card) {
							if (player.isTurnedOver()) return false;
							if (_status.event.useShan) return get.order(card);
							return 0;
						})
						next.set("respondTo", [player, card]);
						next.set("useShan", (() => {
							if (target.hasSkillTag("noShan", null, event)) return false;
							if (target.hasSkillTag("useShan", null, event)) return true;
							return true;
						})());
						//next.autochoose=lib.filter.autoRespondShan;
						result = await next.forResult();
					}
					if (!result || !result.bool || !result.result || result.result != "shaned") {
						if (!event.directHit && !event.directHit2 && lib.filter.cardEnabled(new lib.element.VCard({ name: "shan" }), target, "forceEnable") && target.countCards("hs") > 0 && get.damageEffect(target, player, target) < 0)
							target.addGaintag(target.getCards("hs"), "sha_notshan");

						await target.draw(2);
						await target.turnOver();
					}
				},
				ai: {
					basic: {
						order: 7,
						useful: (card, i) => {
							return 1.5
						},
						value: (card, player) => {
							return 9.2
						},
					},
					result: {
						target(player, target, card) {
							if (target.isTurnedOver()) return 2;
							return -4
						}
					},
					tag: {
						draw: 1.5,
					},
				},
			},
			/*gs_jiao_info: ['饺',
				'出牌阶段，对攻击范围内一名角色使用。目标角色回复1点体力，直到其的回合开始，其受到的伤害+1。',
				'好吃不过饺子，好玩不过骄姿。'],
			gs_jiao: {
				fullskin: true,
				type: "basic",
				toself: true,
				//cardcolor: "red",
				enable: true,
				range(card, player, target) {
					return player.inRange(target);
				},
				filterTarget: true,
				async content(event, trigger, player) {
					await event.target.recover();
					event.target.addTempSkill('gs_jiao_buff', { player: 'phaseBegin' })
				},
				ai: {
					basic: {
						order: 9,
						useful: (card, i) => {
							return 2
						},
						value: (card, player) => {
							return 9.2
						},
					},
					result: {
						target(player, target, card) {
							return 4 - target.countCards('h')
						}
					},
				}
			},*/
		},
		...{//事件牌
			gs_dianshi_info: ['点石成金',
				`出牌阶段，对距离2以内的一名其他角色使用。目标角色摸一张牌，然后判定：若结果为${get.colorText('rock', '♦')}/${get.colorText('water', '♥')}/${get.colorText('fire', '♣')}/${get.colorText('wind', '♠')}，令其附着${get.colorText('rock')}/${get.colorText('water')}/${get.colorText('fire')}/${get.colorText('wind')}元素。`,
				'地水火风，领我敕命。</br>再造四大，重铸五行。'],
			gs_dianshi: {
				fullskin: true,
				type: "trick",
				enable: true,
				filter(event, player) {
					return game.hasPlayer(i => get.distance(player, i) <= 2);
				},
				filterTarget(card, player, target) {
					return get.distance(player, target) <= 2
				},
				modTarget: true,
				async content(event, trigger, player) {
					await event.target.draw()
					const suit = await event.target.judge().forResult('suit');
					if (suit) {
						const map = {
							diamond: 'rock',
							spade: 'water',
							club: 'fire',
							spade: 'wind',
						}
						await event.target.gainElement(map[suit])
					}
				},
				ai: {
					wuxie(target, card, player, viewer) {
						if (get.mode() == "guozhan") {
							if (!_status._aozhan) {
								if (!player.isMajor()) {
									if (!viewer.isMajor()) return 0;
								}
							}
						}
					},
					basic: {
						order: 7,
						useful: 4.5,
						value: 9.2,
					},
					result: {
						target(player, target, card) {
							if (!target.getElementList().length) return 0.8
							return -0.2
						}
					},
					tag: {
						draw: 1,

						gs_element: 1,
						rockElement: 0.25,
						waterElement: 0.25,
						fireElement: 0.25,
						windElement: 0.25,
					},
				},
			},
			gs_qvsan_info: ['驱散',
				`出牌阶段，对一名其他角色使用。目标角色附着1点${get.colorText('wind')}元素。`,
				'你这个驱散，能反制召唤物吗？'],
			gs_qvsan: {
				fullskin: true,
				type: "trick",
				enable: true,
				filterTarget: lib.filter.notMe,
				modTarget: true,
				async content(event, trigger, player) {
					event.targets[0].gainElement('wind', player, event);
				},
				ai: {
					basic: {
						order: 10,
						useful: 8,
						value: 1.5
					},
					result: {
						target(player, target, card) {
							if (target.getElementList(true).some(ele => get.gs_reactionList([ele, 'wind']).length > 0)) {
								return 1
							}
							return 0
						},
					},
					tag: {
						gs_element: 1,
						windElement: 1,
					}
				}
			},
		},
		//装备牌
		...{//武器
			gs_xifeng_info: ['西风剑',
				'你使用的【杀】触发元素反应时，可以摸一张牌。',
				''],
			gs_xifeng: {
				//legend: true,
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -1 },
				skills: ["gs_xifeng_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_jili_info: ['祭礼弓',
				`你使用普通【杀】时，可以令其附着${get.colorText('wind')}元素。`,
				''],
			gs_jili: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -4 },
				skills: ["gs_jili_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					windElement: 1,
				}
			},
			gs_qianyan_info: ['千岩长枪',
				'锁定技，手牌数不小于你的其他角色不能响应你的【杀】。',
				''],
			gs_qianyan: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -2 },
				skills: ["gs_qianyan_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_chihu_info: ['吃虎鱼刀',
				'每回合限一次，你可以将一张【杀】当【闪】、【闪】当【杀】使用或打出。',
				''],
			gs_chihu: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -1 },
				skills: ["gs_chihu_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_baichen_info: ['白辰之环',
				`你使用普通【杀】时，可以令其附着2点${get.colorText('thunder')}元素。`,
				''],
			gs_baichen: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -3 },
				skills: ["gs_baichen_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					thunderElement: 1,
				}
			},
			gs_guimu_info: ['桂木斩长正',
				'锁定技，你杀死一名角色后，摸三张牌。',
				''],
			gs_guimu: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -1 },
				skills: ["gs_guimu_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_yingman_info: ['盈满之实',
				`你使用普通【杀】时，可以令其附着2点${get.colorText('grass')}元素。`,
				''],
			gs_yingman: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -3 },
				skills: ["gs_yingman_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					grassElement: 1,
				}
			},
			gs_lieyang_info: ['烈阳之嗣',
				`你使用普通【杀】时，可以令其附着${get.colorText('fire')}元素。`,
				''],
			gs_lieyang: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -4 },
				skills: ["gs_lieyang_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					fireElement: 1,
				}
			},
			gs_xiawan_info: ['峡湾长歌',
				`你使用普通【杀】时，可以令其附着${get.colorText('water')}或${get.colorText('ice')}元素。`,
				''],
			gs_xiawan: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -2 },
				skills: ["gs_xiawan_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					waterElement: 1,
					iceElement: 1,
				}
			},
			gs_shuixian_info: ['水仙十字圣剑',
				'锁定技，你使用【杀】造成伤害时，若场上至少已有4点元素附着，则其伤害+1。',
				''],
			gs_shuixian: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -1 },
				skills: ["gs_shuixian_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_handi_info: ['撼地者',
				'你使用【杀】时，可以指定任意数量的目标。',
				''],
			gs_handi: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -1 },
				skills: ["gs_handi_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_hongde_info: ['虹的行迹',
				'出牌阶段，若你使用的【杀】未造成伤害，本阶段你使用伤害牌的次数限制',
				''],
			gs_hongde: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -2 },
				skills: ["gs_hongde_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_chongqiang_info: ['铳枪',
				'锁定技，你使用【杀】结算期间，目标角色的防具无效。',
				''],
			gs_chongqiang: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -5 },
				skills: ["gs_chongqiang_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_shenjv_info: ['神居岛崩炮',
				'①锁定技，出牌阶段，你不能使用【杀】。②出牌阶段限一次，你可以将一张【杀】置于此牌上，然后若已有至少五张，弃置全部并对攻击范围内一名角色造成3点伤害。',
				''],
			gs_shenjv: {
				fullskin: true,
				type: "equip",
				subtype: "equip1",
				distance: { attackFrom: -9 },
				skills: ["gs_shenjv_skill"],
				onLose() {
					if (player.getExpansions('gs_shenjv_skill').length > 0)
						player.loseToDiscardpile(player.getExpansions('gs_shenjv_skill'));
				},
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
		},
		...{//防具
			gs_zhongzi_info: ['种子结界',
				'锁定技，附带元素的伤害牌对你无效；你受到的属性伤害-1，物理伤害+1。',
				''],
			gs_zhongzi: {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				skills: ["gs_zhongzi_skill1", "gs_zhongzi_skill2"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			'gs_Sada Vin Plata_info': ['Sada Vin Plata',
				`锁定技，与此牌颜色不同的【杀】对你无效。</br>
				重构：出牌阶段限一次，你可以更改装备区内此牌的前缀为：</br>
				①Sada：锁定技，你受到伤害时，防止超过1的部分；你视为附着${get.colorText('rock')}元素。`,
				`②Gusha：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('grass')}元素。</br>
				③Lata：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('ice')}元素。`],
			'gs_Sada Vin Plata': {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				onEquip() {
					player.$syncElement();
				},
				skills: ["gs_Sada Vin Plata_skill", "Vin Plata_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					rockElement: 1,
				}
			},
			'gs_Gusha Vin Plata_info': ['Gusha Vin Plata',
				`锁定技，与此牌颜色不同的【杀】对你无效。</br>
				重构：出牌阶段限一次，你可以更改装备区内此牌的前缀为：</br>
				①Gusha：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('grass')}元素。	`,
				`②Sada：锁定技，你受到伤害时，防止超过1的部分；你视为附着${get.colorText('rock')}元素。</br>
				③Lata：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('ice')}元素。`],
			'gs_Gusha Vin Plata': {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				onEquip() {
					player.$syncElement();
				},
				skills: ["gs_Gusha Vin Plata_skill", "Vin Plata_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					grassElement: 1,
				}
			},
			'gs_Lata Vin Plata_info': ['Lata Vin Plata',
				`锁定技，与此牌颜色不同的【杀】对你无效。</br>
				重构：出牌阶段限一次，你可以更改装备区内此牌的前缀为：</br>
				①Lata：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('ice')}元素。`,
				`②Sada：锁定技，你受到伤害时，防止超过1的部分；你视为附着${get.colorText('rock')}元素。</br>
				③Gusha：锁定技，附着${get.colorText('water')}、${get.colorText('wind')}、${get.colorText('ice')}元素的伤害牌对你无效；你视为附着${get.colorText('grass')}元素。`],
			'gs_Lata Vin Plata': {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				onEquip() {
					player.$syncElement();
				},
				skills: ["gs_Lata Vin Plata_skill", "Vin Plata_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					gs_element: 1,
					iceElement: 1,
				}
			},
			gs_ningyun_info: ['凝云鳞甲',
				'锁定技，①每轮限一次，你横置或翻至背面时，取消之。②准备阶段，你获得判定区内的牌。',
				''],
			gs_ningyun: {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				skills: ["gs_ningyun_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_wangshu_info: ['王树瑞佑',
				'你需要使用或打出【闪】时，可以进行判定。若结果为红色，视为你使用或打出一张【闪】。',
				''],
			gs_wangshu: {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				skills: ["gs_wangshu_skill"],
				ai: {
					basic: {
						equipValue: 7.5,
						order: (card, player) => {
							const equipValue = get.equipValue(card, player) / 20;
							return player && player.hasSkillTag("reverseEquip") ? 8.5 - equipValue : 8 + equipValue;
						},
						useful: 2,
						value: (card, player, index, method) => {
							if (!player.getCards("e").includes(card) && !player.canEquip(card, true)) return 0.01;
							const info = get.info(card),
								current = player.getEquip(info.subtype),
								value = current && card != current && get.value(current, player);
							let equipValue = info.ai.equipValue || info.ai.basic.equipValue;
							if (typeof equipValue == "function") {
								if (method == "raw") return equipValue(card, player);
								if (method == "raw2") return equipValue(card, player) - value;
								return Math.max(0.1, equipValue(card, player) - value);
							}
							if (typeof equipValue != "number") equipValue = 0;
							if (method == "raw") return equipValue;
							if (method == "raw2") return equipValue - value;
							return Math.max(0.1, equipValue - value);
						},
					},
					result: {
						target: (player, target, card) => get.equipResult(player, target, card.name),
					},
				},
			},
			gs_lanna_info: ['兰那罗花冠',
				'锁定技，①摸牌阶段，你的额定摸牌数+1。</br>②此牌离开你的装备区时，你回复1点体力。',
				''],
			gs_lanna: {
				fullskin: true,
				type: "equip",
				subtype: "equip2",
				loseDelay: false,
				onLose() {
					player.addTempSkill("gs_lanna_skill_lose");
				},
				skills: ["gs_lanna_skill"],
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
				tag: {
					recover: 1,
				},
			},
		},
		...{//坐骑
			gs_shenyvlai_info: ['史莱姆气球',
				'锁定技，你的防御距离+1。',
				''],
			gs_shenyvlai: {
				fullskin: true,
				type: "equip",
				subtype: "equip4",
				distance: { globalTo: 1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_rourou_info: ['柔柔羊',
				'锁定技，你的防御距离+1。',
				''],
			gs_rourou: {
				fullskin: true,
				type: "equip",
				subtype: "equip4",
				distance: { globalTo: 1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_andong_info: ['安东·罗杰飞行器',
				'锁定技，你的防御距离+1。',
				''],
			gs_andong: {
				fullskin: true,
				type: "equip",
				subtype: "equip4",
				distance: { globalTo: 1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_maomao_info: ['牦牦驼兽',
				'锁定技，你的进攻距离-1。',
				''],
			gs_maomao: {
				fullskin: true,
				type: "equip",
				subtype: "equip3",
				distance: { globalFrom: -1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_shenghai_info: ['圣骸赤鹫',
				'锁定技，你的进攻距离-1。',
				''],
			gs_shenghai: {
				fullskin: true,
				type: "equip",
				subtype: "equip3",
				distance: { globalFrom: -1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_niye_info: ['匿叶龙',
				'锁定技，你的进攻距离-1。',
				''],
			gs_niye: {
				fullskin: true,
				type: "equip",
				subtype: "equip3",
				distance: { globalFrom: -1 },
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_tewa_info: ['东风之龙 特瓦林',
				'此牌置入装备区前，你可以视其为进攻或防御坐骑。锁定技，你的防御距离+1，你的进攻距离-1。',
				''],
			gs_tewa: {
				fullskin: true,
				type: "equip",
				subtype: "equip6",
				subtypes: ["equip3", "equip4"],
				nomod: true,
				nopower: true,
				distance: {
					globalFrom: -1,
					globalTo: 1,
				},
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_tewa_equip3: {
				fullskin: true,
				type: "equip",
				subtype: "equip3",
				nomod: true,
				nopower: true,
				distance: {
					globalFrom: -1,
					globalTo: 1,
				},
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
			gs_tewa_equip4: {
				fullskin: true,
				type: "equip",
				subtype: "equip4",
				nomod: true,
				nopower: true,
				distance: {
					globalFrom: -1,
					globalTo: 1,
				},
				ai: {
					equipValue(card, player) {
						var num = 2.5 + player.countCards("h") / 3;
						return Math.min(num, 4);
					},
					basic: {
						equipValue: 3.5,
					},
				},
			},
		},
	},
	skill: {
		...{//基本牌
			gs_jiao_buff: {
				charlotte: true,
				equipSkill: true,
				mark: true,
				marktext: '饺',
				intro: {
					name: '饺',
					content: '直到回合开始，你受到的伤害+1。'
				},
				trigger: {
					player: 'damageBegin3',
				},
				forced: true,
				async content(event, trigger, player) {
					game.log(player, '因', { name: 'gs_jiao' }, '此伤害+1')
					trigger.num++;
				},
				ai: {
					effect: {
						target(card, player, target) {
							if (get.tag(card, 'damage') > 0) {
								return [1, -2, 0, 0]
							}
						}
					}
				}
			}
		},
		...{//事件

		},
		...{//装备
			gs_xifeng_skill: {
				equipSkill: true,
				trigger: {
					source: 'reactionBegin'
				},
				filter(event, player) {
					return event.toTrigger.card?.name == 'sha';
				},
				prompt2(event, player) {
					return "摸一张牌";
				},
				async content(event, trigger, player) {
					player.draw()
				},
				"_priority": -25,
			},
			gs_jili_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				filter(event, player) {
					if (event.card.name == "sha" && !game.hasNature(event.card)) return true;
				},
				prompt2(event, player) {
					return "令" + get.translation(event.card) + "附着风元素";
				},
				async content(event, trigger, player) {
					game.setElement(trigger.card, "wind", true);
					if (get.itemtype(trigger.card) == "card") {
						let next = game.createEvent("zhuque_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							game.setElement(trigger.card, {});
						});
					}
				},
				"_priority": -25,
			},
			gs_qianyan_skill: {
				equipSkill: true,
				forced: true,
				trigger: {
					player: "useCard",
				},
				filter(event, player) {
					return event.card.name == 'sha' &&
						game.hasPlayer(current => current != player && current.countCards('h') >= player.countCards('h'))
				},
				content() {
					trigger.directHit.addArray(
						game.filterPlayer(function (current) {
							return current != player && current.countCards('h') >= player.countCards('h')
						})
					);
				},
				ai: {
					"directHit_ai": true,
					skillTagFilter(player, tag, arg) {
						return arg.card.name == 'sha' && arg.target.countCards('h') > player.countCards('h');
					},
				},
				"_priority": -25,
			},
			gs_chihu_skill: {
				equipSkill: true,
				enable: ["chooseToUse", "chooseToRespond"],
				filter(event, player) {
					if (event.type == "wuxie" || player.getHistory('useCard', (evt) => evt.skill == 'gs_chihu_skill_backup').length > 0 ||
						player.getHistory('respond', (evt) => evt.skill == 'gs_chihu_skill_backup').length > 0) return false;
					for (var name of ["sha", "shan"]) {
						if (event.filterCard(get.autoViewAs({ name: name }, 'unsure'), player, event)) return true;
					}
					return false;
				},
				chooseButton: {
					dialog(event, player) {
						let list = [];
						for (var name of ["sha", "shan"]) {
							if (event.filterCard(get.autoViewAs({ name: name }, 'unsure'), player, event)) list.push(["基本", "", name]);
						}
						let dialog = ui.create.dialog("吃虎鱼刀", [list, "vcard"], "hidden");
						dialog.direct = true;
						return dialog;
					},
					backup(links, player) {
						return {
							filterCard(card) {
								return card.name == (links[0][2] == 'sha' ? 'shan' : 'sha')
							},
							viewAs: {
								name: links[0][2],
							},
							popname: true,
							precontent() {
								player.logSkill('gs_chihu_skill')
							}
						};
					},
					prompt(links, player) {
						return `吃虎鱼刀：将一张${get.translation(links[0][2] == 'sha' ? 'shan' : 'sha')}当【${get.translation(links[0][2])}】使用或打出`;
					},
				},
				ai: {
					order: 9,
					respondSha: true,
					respondShan: true,
					result: {
						player: 1,
					},
				},
				"_priority": -25,
			},
			gs_baichen_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				filter(event, player) {
					if (event.card.name == "sha" && !game.hasNature(event.card)) return true;
				},
				prompt2(event, player) {
					return "令" + get.translation(event.card) + "附着2点雷元素";
				},
				async content(event, trigger, player) {
					game.setElement(trigger.card, { thunder: 2 }, true);
					if (get.itemtype(trigger.card) == "card") {
						const next = game.createEvent("gs_baichen_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							game.setElement(trigger.card, {});
						});
					}
				},
				"_priority": -25,
			},
			gs_guimu_skill: {
				equipSkill: true,
				trigger: {
					source: 'dieAfter'
				},
				filter(event, player) {
					return event.player.isDead()
				},
				prompt2(event, player) {
					return "摸三张牌";
				},
				async content(event, trigger, player) {
					player.draw(3)
				},
				"_priority": -25,
			},
			gs_yingman_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				filter(event, player) {
					if (event.card.name == "sha" && !game.hasNature(event.card)) return true;
				},
				prompt2(event, player) {
					return "令" + get.translation(event.card) + "附着2点草元素";
				},
				async content(event, trigger, player) {
					game.setElement(trigger.card, { grass: 2 }, true);
					if (get.itemtype(trigger.card) == "card") {
						let next = game.createEvent("gs_yingman_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							game.setElement(trigger.card, {});
						});
					}
				},
				"_priority": -25,
			},
			gs_lieyang_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				filter(event, player) {
					if (event.card.name == "sha" && !game.hasNature(event.card)) return true;
				},
				prompt2(event, player) {
					return "令" + get.translation(event.card) + "附着火元素";
				},
				async content(event, trigger, player) {
					game.setElement(trigger.card, { fire: 1 }, true);
					if (get.itemtype(trigger.card) == "card") {
						let next = game.createEvent("gs_lieyang_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							game.setElement(trigger.card, {});
						});
					}
				},
				"_priority": -25,
			},
			gs_xiawan_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				filter(event, player) {
					if (event.card.name == "sha" && !game.hasNature(event.card)) return true;
				},
				async cost(event, trigger, player) {
					const control = await player.chooseControl('water', 'ice')
						.set('prompt', "是否发动【峡湾长歌】")
						.set('prompt2', "令" + get.translation(trigger.card) + "附着水或冰元素")
						.forResultControl();
					if (control) {
						event.result = {
							bool: true,
							cost_data: control
						}
					}
				},
				async content(event, trigger, player) {
					game.setElement(trigger.card, event.cost_data, true);
					if (get.itemtype(trigger.card) == "card") {
						let next = game.createEvent("gs_xiawan_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							game.setElement(trigger.card, {});
						});
					}
				},
				"_priority": -25,
			},
			gs_shuixian_skill: {
				equipSkill: true,
				trigger: {
					source: 'damageBegin1'
				},
				filter(event, player) {
					if (event.parent.name == "_lianhuan" || event.parent.name == "_lianhuan2") return false;
					return event.card?.name == "sha" &&
						game.filterPlayer().reduce((sum, current) => sum + current.getElementList().length, 0) >= 4
				},
				prompt2: '令此伤害+1',
				async content(event, trigger, player) {
					trigger.num++;
				},
				ai: {
					effect: {
						player(card, player, target, current, isLink) {
							if (card.name == "sha" && !isLink &&
								game.filterPlayer().reduce((sum, current) => sum + current.getElementList().length, 0) >= 4 &&
								!target.hasSkillTag("filterDamage", null, { player: player, card: card, })
							)
								return [1, 0, 1, -3];
						},
					},
				},
				"_priority": -25,
			},
			gs_handi_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCard1'
				},
				forced: true,
				filter(event, player) {
					return event.card.name == 'sha'
				},
				async content(event, trigger, player) { },
				mod: {
					selectTarget(card, player, range) {
						if (range[1] == -1) return;
						if (card.name == "sha") range[1] = Infinity;
					},
				},
				"_priority": -25,
			},
			gs_hongde_skill: {
				equipSkill: true,
				trigger: {
					player: 'useCardAfter'
				},
				filter(event, player) {
					return event.card.name == 'sha' && !player.hasHistory('sourceDamage', evt => evt.card == event.card);
				},
				prompt2: '令你出牌阶段使用伤害牌的次数限制+2',
				async content(event, trigger, player) {
					player.changeCountUsed(2, 'phaseUseAfter')
				},
				"_priority": -25,
			},
			gs_chongqiang_skill: {
				equipSkill: true,
				trigger: {
					player: "useCardToPlayered",
				},
				filter(event) {
					return event.card.name == "sha";
				},
				forced: true,
				logTarget: "target",
				async content(event, trigger, player) {
					trigger.target.addTempSkill("qinggang2");
					trigger.target.storage.qinggang2.add(trigger.card);
					trigger.target.markSkill("qinggang2");
				},
				ai: {
					"unequip_ai": true,
					skillTagFilter(player, tag, arg) {
						if (arg && arg.name == "sha") return true;
						return false;
					},
				},
				"_priority": -25,
			},
			gs_shenjv_skill: {
				equipSkill: true,
				marktext: '神居岛崩炮',
				intro: {
					markcount: "expansion",
					mark(dialog, storage, player) {
						var cards = player.getExpansions("gs_shenjv_skill");
						if (player.isUnderControl(true)) dialog.addAuto(cards);
						else return "共有" + get.cnNumber(cards.length) + "张牌";
					},
				},
				usable: 1,
				enable: 'phaseUse',
				filterCard(card) {
					return card.name == 'sha'
				},
				check: () => true,
				prompt: '将一张杀置于神居岛崩炮上。凑够五张可以BOOM！！！',
				discard: false,
				lose: false,
				async content(event, trigger, player) {
					let next = player.addToExpansion(event.cards, player, "giveAuto");
					next.gaintag.add("gs_shenjv_skill");
					await next;
					if (player.getExpansions('gs_shenjv_skill').length >= 5) {
						await player.loseToDiscardpile(player.getExpansions('gs_shenjv_skill'));
						const targets = await player.chooseTarget('神居岛崩炮：造成3点伤害')
							.set('ai', (target) => {
								return get.damageEffect(target, player, player) * 3
							}).forResultTargets();
						if (targets) {
							await targets[0].damage(3)
						}
					}
				},
				mod: {
					cardEnabled(card, player, result) {
						if (card.name == "sha" && _status.event.getParent("phaseUse")?.name == 'phaseUse') return false;
					},
				},
				ai: {
					order: 1,
					result: {
						player: 1
					}
				},
				"_priority": -25,
			},
			//防具
			gs_zhongzi_skill1: {
				equipSkill: true,
				trigger: {
					target: ["useCardToBefore"],
				},
				forced: true,
				priority: 6,
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.player.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					if (get.tag(event.card, 'damage') > 0 && event.card.elementObj && Object.keys(event.card.elementObj).length > 0) return true;
					return false;
				},
				content() {
					trigger.cancel();
				},
				ai: {
					effect: {
						target_use(card, player, target, current) {
							if (target.hasSkillTag("unequip2")) return;
							if (player.hasSkillTag("unequip", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							}) || player.hasSkillTag("unequip_ai", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							})) return;
							if (card.elementObj && Object.keys(card.elementObj).length > 0) return "zerotarget"
						},
					},
				},
				"_priority": 575,
			}, gs_zhongzi_skill2: {
				equipSkill: true,
				trigger: {
					player: ['damageBegin3']
				},
				forced: true,
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.source?.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					return event.num != 0
				},
				async content(event, trigger, player) {
					if (!trigger.nature?.length > 0) {
						trigger.num++;
					} else {
						trigger.num--;
					}
				},
				ai: {
					effect: {
						target(card, player, target, current) {
							if (get.tag(card, "natureDamage") && current < 0) return 0
							if (!get.tag(card, "natureDamage") && current < 0) return 2
						},
					},
				},
				"_priority": -25
			},
			'gs_Sada Vin Plata_skill': {
				equipSkill: true,
				trigger: {
					target: "shaBegin",
				},
				forced: true,
				priority: 6,
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.player.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					return event.card.name == "sha" && get.color(event.card) != get.color(player.getEquip('gs_Sada Vin Plata'))
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				group: 'gs_Sada Vin Plata_skill_x',
				subSkill: {
					x: {
						equipSkill: true,
						trigger: {
							player: "damageBegin4",
						},
						forced: true,
						filter(event, player) {
							if (event.num <= 1) return false;
							if (player.hasSkillTag("unequip2")) return false;
							if (
								event.source &&
								event.source.hasSkillTag("unequip", false, {
									name: event.card ? event.card.name : null,
									target: player,
									card: event.card,
								})
							)
								return false;
							return true;
						},
						content() {
							trigger.num = 1;
						},
						ai: {
							filterDamage: true,
							skillTagFilter(player, tag, arg) {
								if (player.hasSkillTag("unequip2")) return false;
								if (arg && arg.player) {
									if (
										arg.player.hasSkillTag("unequip", false, {
											name: arg.card ? arg.card.name : null,
											target: player,
											card: arg.card,
										})
									)
										return false;
									if (
										arg.player.hasSkillTag("unequip_ai", false, {
											name: arg.card ? arg.card.name : null,
											target: player,
											card: arg.card,
										})
									)
										return false;
									if (arg.player.hasSkillTag("jueqing", false, player)) return false;
								}
							},
						},
						"_priority": -25,
					}
				},
				mod: {
					enchant(player, result) {
						return (lib.nature.get(result) || 0) > (lib.nature.get('rock') || 0) ? result : 'rock'
					},
				},
				ai: {
					effect: {
						target_use(card, player, target) {
							if (typeof card !== "object" || target.hasSkillTag("unequip2")) return;
							if (player.hasSkillTag("unequip", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							}) || player.hasSkillTag("unequip_ai", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							})) return;
							if (card.name == "sha" && get.color(card) != get.color(target.getEquip('gs_Sada Vin Plata'))) return "zeroplayertarget";
						},
					},
				},
				"_priority": 575,
			}, 'gs_Gusha Vin Plata_skill': {
				equipSkill: true,
				trigger: {
					target: "shaBegin",
				},
				forced: true,
				priority: 6,
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.player.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					return event.card.name == "sha" && get.color(event.card) != get.color(player.getEquip('gs_Gusha Vin Plata'))
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				group: 'gs_Gusha Vin Plata_skill_x',
				subSkill: {
					x: {
						equipSkill: true,
						trigger: {
							target: ["useCardToBefore"],
						},
						forced: true,
						priority: 6,
						filter(event, player) {
							if (player.hasSkillTag("unequip2")) return false;
							if (event.player.hasSkillTag("unequip", false, {
								name: event.card ? event.card.name : null,
								target: player,
								card: event.card,
							})) return false;
							if (
								get.tag(event.card, 'damage') > 0 &&
								event.card.elementObj &&
								('water' in event.card.elementObj || 'wind' in event.card.elementObj || 'ice' in event.card.elementObj)
							) return true;
							return false;
						},
						content() {
							trigger.cancel();
						},
						ai: {
							effect: {
								target_use(card, player, target, current) {
									if (target.hasSkillTag("unequip2")) return;
									if (player.hasSkillTag("unequip", false, {
										name: card ? card.name : null,
										target: target,
										card: card,
									}) || player.hasSkillTag("unequip_ai", false, {
										name: card ? card.name : null,
										target: target,
										card: card,
									})) return;
									if (card.elementObj && ('water' in card.elementObj || 'wind' in card.elementObj || 'ice' in card.elementObj)) return "zerotarget"
								},
							},
						},
						"_priority": 575,
					}
				},
				mod: {
					enchant(player, result) {
						return (lib.nature.get(result) || 0) > (lib.nature.get('grass') || 0) ? result : 'grass'
					},
				},
				ai: {
					effect: {
						target_use(card, player, target) {
							if (typeof card !== "object" || target.hasSkillTag("unequip2")) return;
							if (player.hasSkillTag("unequip", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							}) || player.hasSkillTag("unequip_ai", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							})) return;
							if (card.name == "sha" && get.color(card) != get.color(target.getEquip('gs_Gusha Vin Plata'))) return "zeroplayertarget";
						},
					},
				},
				"_priority": 575,
			}, 'gs_Lata Vin Plata_skill': {
				equipSkill: true,
				trigger: {
					target: "shaBegin",
				},
				forced: true,
				priority: 6,
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.player.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					console.log(get.color(event.card), get.color(player.getEquip('gs_Lata Vin Plata')));

					return event.card.name == "sha" && get.color(event.card) != get.color(player.getEquip('gs_Lata Vin Plata'))
				},
				async content(event, trigger, player) {
					trigger.cancel();
				},
				group: 'gs_Lata Vin Plata_skill_x',
				subSkill: {
					x: {
						equipSkill: true,
						trigger: {
							target: ["useCardToBefore"],
						},
						forced: true,
						priority: 6,
						filter(event, player) {
							if (player.hasSkillTag("unequip2")) return false;
							if (event.player.hasSkillTag("unequip", false, {
								name: event.card ? event.card.name : null,
								target: player,
								card: event.card,
							})) return false;
							if (
								get.tag(event.card, 'damage') > 0 &&
								event.card.elementObj &&
								('water' in event.card.elementObj || 'wind' in event.card.elementObj || 'ice' in event.card.elementObj)
							) return true;
							return false;
						},
						content() {
							trigger.cancel();
						},
						ai: {
							effect: {
								target_use(card, player, target, current) {
									if (target.hasSkillTag("unequip2")) return;
									if (player.hasSkillTag("unequip", false, {
										name: card ? card.name : null,
										target: target,
										card: card,
									}) || player.hasSkillTag("unequip_ai", false, {
										name: card ? card.name : null,
										target: target,
										card: card,
									})) return;
									if (card.elementObj && ('water' in card.elementObj || 'wind' in card.elementObj || 'ice' in card.elementObj)) return "zerotarget"
								},
							},
						},
						"_priority": 575,
					}
				},
				mod: {
					enchant(player, result) {
						return (lib.nature.get(result) || 0) > (lib.nature.get('ice') || 0) ? result : 'ice'
					},
				},
				ai: {
					effect: {
						target_use(card, player, target) {
							if (typeof card !== "object" || target.hasSkillTag("unequip2")) return;
							if (player.hasSkillTag("unequip", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							}) || player.hasSkillTag("unequip_ai", false, {
								name: card ? card.name : null,
								target: target,
								card: card,
							})) return;
							if (card.name == "sha" && get.color(card) != get.color(target.getEquip('gs_Lata Vin Plata'))) return "zeroplayertarget";
						},
					},
				},
				"_priority": 575,
			}, 'Vin Plata_skill': {
				equipSkill: true,
				enable: 'phaseUse',
				usable: 1,
				filterCard: () => false,
				selectCard: [-1, -2],
				prompt: '是否更改Vin Plata的前缀？',
				filter(event, player) {
					if (player.hasSkillTag("unequip2")) return false;
					if (event.player.hasSkillTag("unequip", false, {
						name: event.card ? event.card.name : null,
						target: player,
						card: event.card,
					})) return false;
					return player.getCards('e').some(card => ['gs_Sada Vin Plata', 'gs_Lata Vin Plata', 'gs_Gusha Vin Plata'].includes(card.name))
				},
				async content(event, trigger, player) {
					const
						old_card = player.getCards('e').find(card => ['gs_Sada Vin Plata', 'gs_Lata Vin Plata', 'gs_Gusha Vin Plata'].includes(card.name)),
						old_name = old_card.name.slice(3, -10)
					let names = ['Sada', 'Lata', 'Gusha'];
					names.remove(old_name);
					const control = await player
						.chooseControl(names)
						.set('prompt', '重构：选择可修改的其他前缀')

						.forResultControl();
					if (control) {
						const new_name = `gs_${control} Vin Plata`;
						const new_card = game.createCard2(new_name, get.suit(old_card) ?? 'spade', get.number(old_card) ?? 1);
						await player.lose(old_card, ui.special);
						old_card.fix();
						old_card.remove();
						old_card.destroyed = true;
						game.log(old_card, '被重构了');
						lib.inpile.remove(old_card.name);
						lib.inpile.add(new_name);

						player.equip(new_card);
					}
				},
			},
			gs_ningyun_skill: {
				equipSkill: true,
				trigger: {
					player: ["turnOverBefore", "linkBefore", "phaseZhunbeiBegin"]
				},
				forced: true,
				filter(event, player) {
					if (event.name == 'phaseZhunbei') return player.countCards('j');
					if (player.hasSkill('gs_ningyun_skill_usable')) return false;
					return event.name == 'turnOver' ? !player.isTurnedOver() : !player.isLinked()
				},
				async content(event, trigger, player) {
					if (trigger.name == 'phaseZhunbei') player.gain(player.getCards('j'), 'giveAuto', player)
					else {
						player.addSkill('gs_ningyun_skill_usable')
						trigger.cancel();
					}
				},
				ai: {
					noLink: true,
					noTurnover: true,
					effect: {
						target(card, player, target, current) {
							if (!target.hasSkill('gs_ningyun_skill_usable') && get.tag(card, "turnOver")) return [0, 0];
						},
						target_use(card, player, target, current) {
							if (!target.hasSkill('gs_ningyun_skill_usable') && ["tiesuo", "lulitongxin"].includes(card.name)) return "zeroplayertarget";

						},
					},
				},
				subSkill: {
					usable: {
						mark: true,
						marktext: '凝云鳞甲',
						intro: {
							content: '已抵挡过翻至背面或横置'
						}
					}
				},
				"_priority": -25,
			},
			gs_wangshu_skill: {
				equipSkill: true,
				trigger: {
					player: ["chooseToRespondBegin", "chooseToUseBegin"],
				},
				filter(event, player) {
					if (event.responded) return false;
					if (event.gs_wangshu_skill) return false;
					if (!event.filterCard || !event.filterCard({ name: "shan" }, player, event)) return false;
					if (event.name == "chooseToRespond" && !lib.filter.cardRespondable({ name: "shan" }, player, event)) return false;
					if (player.hasSkillTag("unequip2")) return false;
					var evt = event.getParent();
					if (
						evt.player &&
						evt.player.hasSkillTag("unequip", false, {
							name: evt.card ? evt.card.name : null,
							target: player,
							card: evt.card,
						})
					)
						return false;
					return true;
				},
				audio: true,
				check(event, player) {
					if (!event) return true;
					if (event.ai) {
						var ai = event.ai;
						var tmp = _status.event;
						_status.event = event;
						var result = ai({ name: "shan" }, _status.event.player, event);
						_status.event = tmp;
						return result > 0;
					}
					let evt = event.getParent();
					if (player.hasSkillTag("noShan", null, evt)) return false;
					if (!evt || !evt.card || !evt.player || player.hasSkillTag("useShan", null, evt))
						return true;
					if (
						evt.card &&
						evt.player &&
						player.isLinked() &&
						game.hasNature(evt.card) &&
						get.attitude(player, evt.player._trueMe || evt.player) > 0
					)
						return false;
					return true;
				},
				prompt2: '进行判定，若结果为红色则视为出闪',
				content() {
					"step 0";
					trigger.gs_wangshu_skill = true;
					player.judge("gs_wangshu", function (card) {
						return get.color(card) == "red" ? 1.5 : -0.5;
					}).judge2 = function (result) {
						return result.bool;
					};
					"step 1";
					if (result.judge > 0) {
						trigger.untrigger();
						trigger.set("responded", true);
						trigger.result = { bool: true, card: { name: "shan", isCard: true } };
					}
				},
				ai: {
					respondShan: true,
					freeShan: true,
					skillTagFilter(player, tag, arg) {
						if (tag !== "respondShan" && tag !== "freeShan") return;
						if (player.hasSkillTag("unequip2")) return false;
						if (!arg || !arg.player) return true;
						if (
							arg.player.hasSkillTag("unequip", false, {
								target: player,
							})
						)
							return false;
						return true;
					},
					effect: {
						target(card, player, target, effect) {
							if (target.hasSkillTag("unequip2")) return;
							if (
								player.hasSkillTag("unequip", false, {
									name: card ? card.name : null,
									target: target,
									card: card,
								}) ||
								player.hasSkillTag("unequip_ai", false, {
									name: card ? card.name : null,
									target: target,
									card: card,
								})
							)
								return;
							if (get.tag(card, "respondShan")) return 0.5;
						},
					},
				},
				"_priority": -25,
			},
			gs_lanna_skill: {
				equipSkill: true,
				trigger: {
					player: "phaseDrawBegin2",
				},
				forced: true,
				filter(event, player) {
					return !event.numFixed;
				},
				content() {
					trigger.num++;
				},
				subSkill: {
					lose: {
						audio: "gs_lanna_skill",
						forced: true,
						charlotte: true,
						equipSkill: true,
						trigger: {
							player: "loseAfter",
							global: ["equipAfter", "addJudgeAfter", "gainAfter", "loseAsyncAfter", "addToExpansionAfter"],
						},
						filter: (event, player) => {
							if (player.isHealthy() || player.hasSkillTag("unequip2")) return false;
							var evt = event.getl(player);
							return evt && evt.es.some((card) => card.name == "gs_lanna");
						},
						content() {
							var evt = trigger.getl(player);
							evt.es.forEach((card) => {
								if (card.name == "gs_lanna") {
									player.recover();
								}
							});
						},
						"_priority": -25,
					},
				},
				"_priority": -25,
			},
			_gs_tewa_skill: {
				trigger: {
					player: 'equipBefore'
				},
				filter(event, player) {
					return event.card.name == 'gs_tewa'
				},
				async cost(event, trigger, player) {
					let list = [];
					if (player.hasEnabledSlot('equip3')) list.add('equip3')
					if (player.hasEnabledSlot('equip4')) list.add('equip4')
					if (!list.length) return;
					const control = await player.chooseControl(list)
						.set('prompt', "特瓦林：选择置入的装备栏")
						.forResultControl();
					if (control) {
						event.result = {
							bool: true,
							cost_data: control
						}
					}
				},
				async content(event, trigger, player) {
					lib.translate['gs_tewa_' + event.cost_data] = lib.translate['gs_tewa'];
					lib.translate['gs_tewa_' + event.cost_data + '_info'] = lib.translate['gs_tewa_info'];
					trigger.card.init({
						suit: get.suit(trigger.card),
						number: get.number(trigger.card),
						nature: get.nature(trigger.card),
						name: 'gs_tewa_' + event.cost_data
					})
					if (get.itemtype(trigger.card) == "card") {
						let next = game.createEvent("gs_tewa_skill_clear");
						next.card = trigger.card;
						event.next.remove(next);
						trigger.after.push(next);
						next.setContent(function () {
							event.card.init({
								suit: get.suit(event.card),
								number: get.number(event.card),
								nature: get.nature(event.card),
								name: 'gs_tewa'
							})
						});
					}
				}
			},
		},
	},
	translate: {
		//武器
		gs_xifeng_skill: '西风剑',
		gs_jili_skill: '祭礼弓',
		gs_qianyan_skill: '千岩长枪',
		gs_chihu_skill: '吃虎鱼刀',
		gs_baichen_skill: '白辰之环',
		gs_guimu_skill: '桂木斩长正',
		gs_yingman_skill: '盈满之实',
		gs_lieyang_skill: '烈阳之嗣',
		gs_xiawan_skill: '峡湾长歌',
		gs_shuixian_skill: '水仙十字圣剑',
		gs_handi_skill: '撼地者',
		gs_hongde_skill: '虹的行迹',
		gs_chongqiang_skill: '铳枪',
		gs_shenjv_skill: '神居岛崩炮',
		//防具
		gs_zhongzi_skill: '种子结界', gs_zhongzi_skill1: '种子结界', gs_zhongzi_skill2: '种子结界',
		'Vin Plata_skill': '重构',
		'gs_Sada Vin Plata_skill': 'Sada Vin Plata',
		'gs_Gusha Vin Plata_skill': 'Gusha Vin Plata',
		'gs_Lata Vin Plata_skill': 'Lata Vin Plata',
		gs_ningyun_skill: '凝云鳞甲',
		gs_wangshu_skill: '王树瑞佑',
		gs_lanna_skill: '兰那罗花冠',
	},
	list: [
		//基础牌堆
		...[['diamond', 1, 'gs_shenyv'],
		['diamond', 2, 'gs_ciai'],
		['diamond', 3, 'shan'],
		['diamond', 4, 'gs_ciai'],
		['diamond', 5, 'shan'],
		['diamond', 6, 'sha'],
		['diamond', 7, 'sha'],
		['diamond', 8, 'sha'],
		['diamond', 9, 'shan'],
		['diamond', 10, 'gs_ciai'],
		['diamond', 11, 'shan'],
		['diamond', 12, 'gs_ciai'],
		['diamond', 13, 'shan'],

		['club', 1, 'sha'],
		['club', 2, 'sha'],
		['club', 3, 'sha'],
		['club', 4, 'sha'],
		['club', 5, 'gs_shenyv'],
		['club', 6, 'sha'],
		['club', 7, 'sha'],
		['club', 8, 'sha'],
		['club', 9, 'sha'],
		['club', 10, 'sha'],
		['club', 11, 'sha'],
		['club', 12, 'sha'],
		['club', 13, 'sha'],

		['heart', 1, 'shan'],
		['heart', 2, 'gs_ciai'],
		['heart', 3, 'shan'],
		['heart', 4, 'shan'],
		['heart', 5, 'shan'],
		['heart', 6, 'gs_ciai'],
		['heart', 7, 'shan'],
		['heart', 8, 'gs_ciai'],
		['heart', 9, 'shan'],
		['heart', 10, 'shan'],
		['heart', 11, 'shan'],
		['heart', 12, 'gs_ciai'],
		['heart', 13, 'shan'],

		['spade', 1, 'sha'],
		['spade', 2, 'sha'],
		['spade', 3, 'sha'],
		['spade', 4, 'sha'],
		['spade', 5, 'sha'],
		['spade', 6, 'shan'],
		['spade', 7, 'shan'],
		['spade', 8, 'shan'],
		['spade', 9, 'sha'],
		['spade', 10, 'sha'],
		['spade', 11, 'gs_shenyv'],
		['spade', 12, 'gs_liefeng'],
		['spade', 13, 'gs_shenyv'],
		],
		...[['diamond', 1, 'gs_dianshi'],
		['diamond', 2, 'gs_pianpianhua'],
		['diamond', 3, 'gs_lichang'],
		['diamond', 4, 'gs_linfen'],
		['diamond', 5, 'gs_dianshi'],
		['diamond', 6, 'gs_Sada Vin Plata'],
		['diamond', 7, 'gs_xvkong'],
		['diamond', 8, 'gs_maomao'],
		['diamond', 9, 'gs_wangshu'],
		['diamond', 10, 'wuxie'],
		['diamond', 11, 'gs_handi'],
		['diamond', 12, 'gs_qianyan'],
		['diamond', 13, 'gs_yanlong'],

		['club', 1, 'gs_shenghuo'],
		['club', 2, 'gs_huima'],
		['club', 3, 'gs_chihu'],
		['club', 4, 'gs_luli'],
		['club', 5, 'gs_shenyvlai'],
		['club', 6, 'gs_ningyun'],
		['club', 7, 'gs_andong'],
		['club', 8, 'gs_shenghai'],
		['club', 9, 'gs_xieyan'],
		['club', 10, 'wuxie'],
		['club', 11, 'gs_shenjv'],
		['club', 12, 'gs_lieyang'],
		['club', 13, 'gs_Unu'],

		['heart', 1, 'gs_qianshui'],
		['heart', 2, 'gs_dimai'],
		['heart', 3, 'gs_rourou'],
		['heart', 4, 'gs_zhongzi'],
		['heart', 5, 'gs_yingman'],
		['heart', 6, 'gs_suoguo'],
		['heart', 7, 'gs_yuanzheng'],
		['heart', 8, 'gs_niye'],
		['heart', 9, 'gs_lanna'],
		['heart', 10, 'wuxie'],
		['heart', 11, 'gs_hongde'],
		['heart', 12, 'gs_xiawan'],
		['heart', 13, 'gs_shuixian'],

		['spade', 1, 'gs_qvsan'],
		['spade', 2, 'gs_fuji'],
		['spade', 3, 'gs_xifeng'],
		['spade', 4, 'gs_guimu'],
		['spade', 5, 'gs_chongqiang'],
		['spade', 6, 'gs_yanshou'],
		['spade', 7, 'gs_yvqian'],
		['spade', 8, 'gs_jili'],
		['spade', 9, 'gs_baichen'],
		['spade', 10, 'wuxie'],
		['spade', 11, 'gs_siyv'],
		['spade', 12, 'gs_jinji'],
		['spade', 13, 'gs_tewa'],
		],
		//额外牌堆
		['diamond', 1, 'gs_ningjie'],
		['diamond', 4, 'gs_Sada Vin Plata'],
		['club', 1, 'gs_yingran'],
		['heart', 1, 'gs_chizhi'],
		['heart', 4, 'gs_Lata Vin Plata'],
		['spade', 1, 'gs_shenyvneng'],
		['spade', 4, 'gs_Gusha Vin Plata'],
	]
}
for (let name in gsCards.card) {
	if (gsCards.card[name].type != 'equip') continue;
	if (gsCards.card[name].enable) continue;
	const 最实用的代码 = {
		enable: true,
		selectTarget: -1,
		filterTarget: (card, player, target) => player == target && target.canEquip(card, true),
		modTarget: true,
		allowMultiple: false,
		content() {
			//不存在处理区外的牌=全部都在处理区
			if (!card?.cards.some(card => get.position(card, true) !== "o")) target.equip(card);
		},
		toself: true,
	}
	Object.assign(gsCards.card[name], 最实用的代码);
}
export { gsCards }