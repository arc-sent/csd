import { request } from './api.js';

export function loadStages() {
  return request('/stages');
}
export function getStage(id) {
  return request('/stages/' + id);
}
function stagePayload(stage) {
  const { name, description, price, status } = stage;
  return { name, description, price, status };
}
export function upsertStage(stage) {
  if (stage.id) {
    return request('/stages/' + stage.id, { method: 'PUT', body: JSON.stringify(stagePayload(stage)) });
  }
  return request('/stages', { method: 'POST', body: JSON.stringify(stagePayload(stage)) });
}
export function deleteStage(id) {
  return request('/stages/' + id, { method: 'DELETE' });
}
export function setStageStatus(id, status) {
  return request('/stages/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function loadAssignments(stageId) {
  return request('/assignments' + (stageId ? '?stageId=' + encodeURIComponent(stageId) : ''));
}
export function getAssignment(id) {
  return request('/assignments/' + id);
}
function assignmentPayload(assignment) {
  const { stageId, name, description, price, status } = assignment;
  return { stageId, name, description, price: price == null ? 0 : price, status };
}
export function upsertAssignment(assignment) {
  if (assignment.id) {
    return request('/assignments/' + assignment.id, { method: 'PUT', body: JSON.stringify(assignmentPayload(assignment)) });
  }
  return request('/assignments', { method: 'POST', body: JSON.stringify(assignmentPayload(assignment)) });
}
export function deleteAssignment(id) {
  return request('/assignments/' + id, { method: 'DELETE' });
}
export function setAssignmentStatus(id, status) {
  return request('/assignments/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
}

export function loadLevels(assignmentId) {
  return request('/levels' + (assignmentId ? '?assignmentId=' + encodeURIComponent(assignmentId) : ''));
}
export function getLevel(id) {
  return request('/levels/' + id);
}
function levelPayload(level) {
  const {
    name, description, difficulty, category, position, turn, castling,
    enPassant, halfmoveClock, fullmoveNumber, steps, result, status, assignmentId
  } = level;
  return {
    name, description, difficulty, category, position, turn, castling,
    enPassant: enPassant || null,
    halfmoveClock: halfmoveClock == null ? 0 : halfmoveClock,
    fullmoveNumber: fullmoveNumber == null ? 1 : fullmoveNumber,
    steps, result: result || null, status, assignmentId: assignmentId || null
  };
}
export function upsertLevel(level) {
  if (level.id) {
    return request('/levels/' + level.id, { method: 'PUT', body: JSON.stringify(levelPayload(level)) });
  }
  return request('/levels', { method: 'POST', body: JSON.stringify(levelPayload(level)) });
}
export function deleteLevel(id) {
  return request('/levels/' + id, { method: 'DELETE' });
}
export function setLevelStatus(id, status) {
  return request('/levels/' + id + '/status', { method: 'PATCH', body: JSON.stringify({ status }) });
}

function query(params) {
  const pairs = Object.entries(params).filter(([, v]) => v);
  return pairs.length ? '?' + pairs.map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&') : '';
}

export function loadPayments({ q, status, assignmentId } = {}) {
  return request('/payments' + query({ q, status, assignmentId }));
}
export function refreshPayment(id) {
  return request('/payments/' + id + '/refresh', { method: 'POST' });
}

export function loadUsers({ q } = {}) {
  return request('/users' + query({ q }));
}
export function getUser(id) {
  return request('/users/' + id);
}
export function grantAssignment(userId, { assignmentId, stageId, note }) {
  return request('/users/' + userId + '/grants', {
    method: 'POST',
    body: JSON.stringify({ assignmentId, stageId, note: note || undefined })
  });
}
export function revokeGrant(userId, grantId) {
  return request('/users/' + userId + '/grants/' + grantId, { method: 'DELETE' });
}

export function blankStage() {
  return { id: null, name: '', description: '', price: 0, status: 'draft' };
}
export function blankAssignment(stageId) {
  return { id: null, stageId: stageId || null, name: '', description: '', price: 1200, status: 'draft' };
}
