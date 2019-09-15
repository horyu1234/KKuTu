/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var MAX_LEVEL = 360;
var Lizard	= require("./lizard.js");
var EXP = [];

function alphakkutuscore(lv){
	return Math.round((!(lv%5)*0.3 + 1) * (!(lv%15)*0.4 + 1) * (!(lv%45)*0.5 + 1) * (120 + Math.floor(lv/5)*60 + Math.floor(lv*lv/225)*120 + Math.floor(lv*lv/2025)*180));
}
EXP.push(alphakkutuscore(1));
for(let i=2; i<MAX_LEVEL; i++)
	EXP.push(EXP[i-2] + alphakkutuscore(i));
EXP[MAX_LEVEL - 1] = Infinity;
EXP.push(Infinity);

exports.getLevel = _score => {
	let score = typeof _score == 'object' ? _score.data.score : _score;
	let l = EXP.length, level = 1;
	for ( ; level<=l ; level++) if (score < EXP[level-1]) break;
	return level;
};
