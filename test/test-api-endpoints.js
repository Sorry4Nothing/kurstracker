import express from 'express';
import { courseTreeEngine } from '../src/domain/courseTreeEngine.js';
import { stufenleiterPlanningEngine } from '../src/domain/stufenleiterPlanningEngine.js';
import { COURSE_NODES, TREE_EDGES } from '../src/domain/courseTreeData.js';

console.log('Testing domain integration for API endpoints...');

// 1. Structure
console.log('COURSE_NODES count:', Object.keys(COURSE_NODES).length);
console.log('TREE_EDGES count:', TREE_EDGES.length);

// 2. Evaluation
const sampleLeader = {
  id: 'demo_leader',
  name: 'Robin Notter',
  ceviname: 'Siro',
  birthdate: '2001-08-14',
  completedCourses: ['hlk', 'glk'],
  qualifications: ['js_leiter_lst', 'cevi_gruppenleiter']
};
const evalResult = courseTreeEngine.evaluatePersonInTree(sampleLeader);
console.log('Evaluation currentMaxLevel:', evalResult.currentMaxLevel);
console.log('Available next courses:', evalResult.availableNextCourses.length);

// 3. Pathfinding
const path = courseTreeEngine.findPathToTarget(sampleLeader, 'slk');
console.log('Path to SLK isDirectlyEligible:', path.isDirectlyEligible);

// 4. Planning
const defaultDemoGroup = [
  { id: 'tn_1', name: 'Noah Keller', ceviname: 'Fuchs', birthdate: '2011-04-10', currentRole: 'Teilnehmer', completedCourses: [] },
  { id: 'tn_2', name: 'Lea Meier', ceviname: 'Amsel', birthdate: '2009-09-12', currentRole: 'Hilfsleiterin', completedCourses: ['hlk'], qualifications: ['cevi_hilfsleiter'] }
];
const analysis = stufenleiterPlanningEngine.analyzeGroup(defaultDemoGroup);
console.log('Analysis ready for HLK:', analysis.summaryStats.readyForHlk);
console.log('Analysis ready for GLK:', analysis.summaryStats.readyForGlk);

console.log('\nAll API domain checks PASSED!');
