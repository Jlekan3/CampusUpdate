#!/usr/bin/env node
/**
 * RMU Campus Map — Admin CLI
 * ───────────────────────────
 * Communicates directly with Supabase using the service-role key
 * (bypasses RLS, so keep this file and .env off production servers).
 *
 * Usage:
 *   node admin-cli.js
 *   npm run admin
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env (Settings → API in Supabase Dashboard).
 */

'use strict';

const readline = require('readline');
const path     = require('path');
const fs       = require('fs');

// ─── Load .env ───────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  });
}

const SUPABASE_URL      = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
  console.error('\n❌  EXPO_PUBLIC_SUPABASE_URL not set in .env\n');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY || SERVICE_ROLE_KEY.includes('your-service-role')) {
  console.error('\n❌  SUPABASE_SERVICE_ROLE_KEY not set in .env');
  console.error('    Dashboard → Settings → API → service_role (secret)\n');
  process.exit(1);
}

// ─── Supabase client (service-role — bypasses RLS) ───────────────────────────
// Node.js < 22 has no native WebSocket; supply the 'ws' package as transport.
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth:     { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

// ─── Terminal colours (ANSI) ──────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  navy:   '\x1b[34m',
  gold:   '\x1b[33m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
  bgNavy: '\x1b[44m',
};
const b  = (s) => `${C.bold}${s}${C.reset}`;
const g  = (s) => `${C.green}${s}${C.reset}`;
const r  = (s) => `${C.red}${s}${C.reset}`;
const y  = (s) => `${C.gold}${s}${C.reset}`;
const c  = (s) => `${C.cyan}${s}${C.reset}`;
const d  = (s) => `${C.dim}${s}${C.reset}`;

// ─── readline helpers ─────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (prompt) => new Promise((res) => rl.question(prompt, res));

const prompt = async (label, defaultVal = '') => {
  const hint = defaultVal ? ` ${d(`[${defaultVal}]`)}` : '';
  const ans  = (await ask(`  ${c('›')} ${label}${hint}: `)).trim();
  return ans || defaultVal;
};

const choose = async (options) => {
  options.forEach(([key, label], i) => {
    const num = i + 1;
    console.log(`  ${y(num + '.')} ${label}  ${d(key)}`);
  });
  while (true) {
    const ans = (await ask(`\n  ${c('›')} Choice: `)).trim();
    const idx = parseInt(ans, 10) - 1;
    if (idx >= 0 && idx < options.length) return options[idx][0];
    console.log(r('  Invalid — enter a number from the list.'));
  }
};

const confirm = async (msg) => {
  const ans = (await ask(`  ${y('⚠')}  ${msg} ${d('(y/N)')}: `)).trim().toLowerCase();
  return ans === 'y' || ans === 'yes';
};

const hr   = () => console.log(d('  ' + '─'.repeat(54)));
const ok   = (msg) => console.log(`\n  ${g('✓')}  ${msg}`);
const fail = (msg) => console.log(`\n  ${r('✗')}  ${msg}`);
const info = (msg) => console.log(`\n  ${c('ℹ')}  ${msg}`);
const nl   = () => console.log();

const ROLES = ['admin', 'faculty', 'student', 'guest'];
const STATUSES = ['Open', 'Closed', 'Busy', 'Available', 'In Meeting'];
const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'dismissed'];

// ─── Banner ───────────────────────────────────────────────────────────────────
function banner() {
  console.clear();
  console.log(`
${C.navy}${C.bold}  ╔═══════════════════════════════════════════════╗
  ║         RMU Campus Map — Admin CLI            ║
  ╚═══════════════════════════════════════════════╝${C.reset}
  ${d('Connected to:')} ${c(SUPABASE_URL)}
`);
}

// ─── Pause ────────────────────────────────────────────────────────────────────
const pause = () => ask(`\n  ${d('Press Enter to continue...')}`);

// =============================================================================
// USER MANAGEMENT
// =============================================================================

async function listUsers() {
  const { data, error } = await sb.from('users').select('id, email, full_name, role, department, created_at').order('created_at', { ascending: false });
  if (error) { fail(error.message); return; }
  nl();
  if (!data.length) { info('No users found.'); return; }

  console.log(`  ${b('ID (short)')}          ${b('Email')}                    ${b('Name')}               ${b('Role')}`);
  hr();
  data.forEach((u) => {
    const id   = u.id.slice(0, 8) + '…';
    const email= (u.email || '—').padEnd(28).slice(0, 28);
    const name = (u.full_name || '—').padEnd(18).slice(0, 18);
    const role = u.role === 'admin'   ? r(u.role.padEnd(8))
               : u.role === 'faculty' ? y(u.role.padEnd(8))
               : u.role === 'student' ? g(u.role.padEnd(8))
               : d(u.role.padEnd(8));
    console.log(`  ${d(id)}  ${email}  ${name}  ${role}`);
  });
  hr();
  info(`Total: ${data.length} users`);
}

async function addUser() {
  nl();
  console.log(b('  ── Add New User ──'));
  nl();

  const email    = await prompt('Email address');
  if (!email.includes('@')) { fail('Invalid email.'); return; }

  const password = await prompt('Password (min 6 chars)');
  if (password.length < 6) { fail('Password too short.'); return; }

  const fullName = await prompt('Full name');

  console.log(`\n  ${b('Select role:')}`);
  const role = await choose(ROLES.map((r) => [r, r.charAt(0).toUpperCase() + r.slice(1)]));

  const department = await prompt('Department (optional)', '');
  const programme  = role === 'student' ? await prompt('Programme (optional)', '') : '';
  const studentId  = role === 'student' ? await prompt('Index / Student ID (optional)', '') : '';

  nl();
  if (!await confirm(`Create ${role} account for ${email}?`)) { info('Cancelled.'); return; }

  // Create auth user (confirmed immediately — no email needed)
  const { data: authData, error: authErr } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role, department },
  });
  if (authErr) { fail(authErr.message); return; }

  const userId = authData.user.id;

  // Upsert profile row (trigger may have already inserted it)
  const { error: profileErr } = await sb.from('users').upsert({
    id:         userId,
    email,
    full_name:  fullName,
    role,
    department: department || null,
    programme:  programme  || null,
    student_id: studentId  || null,
  }, { onConflict: 'id' });

  if (profileErr) {
    fail(`Auth user created but profile update failed: ${profileErr.message}`);
    return;
  }

  ok(`User created!  ID: ${userId}`);
  console.log(`     Email:      ${email}`);
  console.log(`     Name:       ${fullName}`);
  console.log(`     Role:       ${role}`);
  if (department) console.log(`     Department: ${department}`);
}

async function updateUserRole() {
  nl();
  console.log(b('  ── Update User Role ──'));
  nl();

  const email = await prompt('Email of user to update');
  const { data: users, error } = await sb.from('users').select('id, email, full_name, role').ilike('email', email);
  if (error || !users?.length) { fail(`User not found: ${email}`); return; }

  const u = users[0];
  console.log(`\n  Found: ${b(u.full_name || u.email)}  ${d('current role:')} ${y(u.role)}`);
  nl();

  console.log(b('  Select new role:'));
  const newRole = await choose(ROLES.map((r) => [r, r.charAt(0).toUpperCase() + r.slice(1)]));

  if (newRole === u.role) { info('Role unchanged.'); return; }
  if (!await confirm(`Change role from "${u.role}" to "${newRole}"?`)) { info('Cancelled.'); return; }

  const { error: dbErr } = await sb.from('users').update({ role: newRole }).eq('id', u.id);
  if (dbErr) { fail(dbErr.message); return; }

  // Also update user metadata so the auth token reflects the new role
  await sb.auth.admin.updateUserById(u.id, { user_metadata: { role: newRole } });

  ok(`Role updated to ${newRole} for ${u.email}`);
}

async function resetPassword() {
  nl();
  console.log(b('  ── Reset User Password ──'));
  nl();

  const email = await prompt('Email of user');
  const { data: users } = await sb.from('users').select('id, email').ilike('email', email);
  if (!users?.length) { fail(`User not found: ${email}`); return; }

  const u = users[0];
  const newPwd = await prompt('New password (min 6 chars)');
  if (newPwd.length < 6) { fail('Password too short.'); return; }

  if (!await confirm(`Reset password for ${u.email}?`)) { info('Cancelled.'); return; }

  const { error } = await sb.auth.admin.updateUserById(u.id, { password: newPwd });
  if (error) { fail(error.message); return; }

  ok(`Password reset for ${u.email}`);
}

async function deleteUser() {
  nl();
  console.log(b('  ── Delete User ──'));
  nl();

  const email = await prompt('Email of user to delete');
  const { data: users } = await sb.from('users').select('id, email, full_name, role').ilike('email', email);
  if (!users?.length) { fail(`User not found: ${email}`); return; }

  const u = users[0];
  console.log(`\n  Found: ${b(u.full_name || u.email)}  Role: ${r(u.role)}`);
  if (!await confirm(`Permanently delete this user and all their data?`)) { info('Cancelled.'); return; }

  // Deleting from auth.users cascades to public.users via FK
  const { error } = await sb.auth.admin.deleteUser(u.id);
  if (error) { fail(error.message); return; }

  ok(`User deleted: ${u.email}`);
}

async function searchUsers() {
  nl();
  const term = await prompt('Search by email or name');
  const { data, error } = await sb.from('users')
    .select('id, email, full_name, role, department')
    .or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);

  if (error) { fail(error.message); return; }
  if (!data?.length) { info('No results.'); return; }

  nl();
  data.forEach((u) => {
    console.log(`  ${c(u.email)}  ${d(u.id.slice(0,8)+'…')}  ${y(u.role)}  ${u.full_name || '—'}  ${u.department ? d(u.department) : ''}`);
  });
}

async function userMenu() {
  while (true) {
    banner();
    console.log(b('  User Management\n'));
    const action = await choose([
      ['list',   'List all users'],
      ['add',    'Add new user'],
      ['role',   'Update user role'],
      ['pwd',    'Reset password'],
      ['search', 'Search users'],
      ['delete', 'Delete user'],
      ['back',   'Back to main menu'],
    ]);
    if (action === 'back') return;
    if (action === 'list')   await listUsers();
    if (action === 'add')    await addUser();
    if (action === 'role')   await updateUserRole();
    if (action === 'pwd')    await resetPassword();
    if (action === 'search') await searchUsers();
    if (action === 'delete') await deleteUser();
    await pause();
  }
}

// =============================================================================
// DEPARTMENT MANAGEMENT
// =============================================================================

async function listDepartments() {
  const { data, error } = await sb.from('departments').select('*').order('name');
  if (error) { fail(error.message); return; }
  if (!data.length) { info('No departments.'); return; }

  nl();
  console.log(`  ${b('Name'.padEnd(30))} ${b('Status'.padEnd(12))} ${b('Category'.padEnd(16))} ${b('Hours')}`);
  hr();
  data.forEach((d) => {
    const status = d.availability_status;
    const col = status === 'Open' ? g(status.padEnd(12))
              : status === 'Closed' ? r(status.padEnd(12))
              : status === 'Busy'   ? y(status.padEnd(12))
              : c(status.padEnd(12));
    console.log(`  ${(d.name || '').padEnd(30)} ${col} ${(d.category || '').padEnd(16)} ${d.operating_hours || '—'}`);
  });
  hr();
  info(`Total: ${data.length} departments`);
}

async function addDepartment() {
  nl();
  console.log(b('  ── Add Department ──'));
  nl();

  const name     = await prompt('Department name');
  const category = await prompt('Category (Academic / Administrative / etc.)', 'Academic');
  const hours    = await prompt('Operating hours (e.g. 9AM – 4PM)', '9AM – 4PM');
  const desc     = await prompt('Description (optional)', '');
  const head     = await prompt('Head of department (optional)', '');
  const email    = await prompt('Contact email (optional)', '');

  console.log(`\n  ${b('Initial status:')}`);
  const status = await choose(STATUSES.map((s) => [s, s]));

  if (!await confirm(`Add department "${name}"?`)) { info('Cancelled.'); return; }

  const { error } = await sb.from('departments').insert({
    name,
    category,
    operating_hours:     hours,
    description:         desc     || null,
    head_of_department:  head     || null,
    contact_email:       email    || null,
    availability_status: status,
  });
  if (error) { fail(error.message); return; }
  ok(`Department "${name}" added.`);
}

async function updateDepartmentStatus() {
  nl();
  console.log(b('  ── Update Department Status ──'));
  nl();

  const { data: depts } = await sb.from('departments').select('id, name, availability_status').order('name');
  if (!depts?.length) { info('No departments.'); return; }

  console.log(b('  Select department:'));
  const deptId = await choose(depts.map((d) => [d.id, `${d.name}  ${d.availability_status ? d(`[${d.availability_status}]`) : ''}`]));

  const dept = depts.find((d) => d.id === deptId);
  console.log(`\n  Current status: ${y(dept.availability_status)}`);
  nl();

  console.log(b('  New status:'));
  const newStatus = await choose(STATUSES.map((s) => [s, s]));

  const newHours = await prompt('Update office hours? (leave blank to keep current)', '');

  if (!await confirm(`Set ${dept.name} → ${newStatus}?`)) { info('Cancelled.'); return; }

  const update = { availability_status: newStatus };
  if (newHours) update.operating_hours = newHours;

  const { error } = await sb.from('departments').update(update).eq('id', deptId);
  if (error) { fail(error.message); return; }
  ok(`${dept.name} is now ${newStatus}.`);
}

async function deleteDepartment() {
  nl();
  const name = await prompt('Department name to delete');
  const { data } = await sb.from('departments').select('id, name').ilike('name', `%${name}%`);
  if (!data?.length) { fail('Department not found.'); return; }

  const dept = data[0];
  if (!await confirm(`Delete "${dept.name}"? This cannot be undone.`)) { info('Cancelled.'); return; }

  const { error } = await sb.from('departments').delete().eq('id', dept.id);
  if (error) { fail(error.message); return; }
  ok(`"${dept.name}" deleted.`);
}

async function departmentMenu() {
  while (true) {
    banner();
    console.log(b('  Department Management\n'));
    const action = await choose([
      ['list',   'List all departments'],
      ['add',    'Add department'],
      ['status', 'Update department status'],
      ['delete', 'Delete department'],
      ['back',   'Back to main menu'],
    ]);
    if (action === 'back') return;
    if (action === 'list')   await listDepartments();
    if (action === 'add')    await addDepartment();
    if (action === 'status') await updateDepartmentStatus();
    if (action === 'delete') await deleteDepartment();
    await pause();
  }
}

// =============================================================================
// REPORTS
// =============================================================================

async function listReports(statusFilter) {
  let query = sb.from('reports').select('id, title, category, status, priority, reporter_name, reporter_email, created_at').order('created_at', { ascending: false });
  if (statusFilter) query = query.eq('status', statusFilter);

  const { data, error } = await query;
  if (error) { fail(error.message); return; }
  if (!data?.length) { info('No reports.'); return; }

  nl();
  console.log(`  ${b('Title'.padEnd(28))} ${b('Status'.padEnd(12))} ${b('Priority'.padEnd(10))} ${b('Reporter')}`);
  hr();
  data.forEach((rep) => {
    const sts = rep.status === 'open'        ? r(rep.status.padEnd(12))
              : rep.status === 'in_progress'  ? y('in_progress'.padEnd(12))
              : rep.status === 'resolved'     ? g(rep.status.padEnd(12))
              : d(rep.status.padEnd(12));
    const pri = rep.priority === 'high' || rep.priority === 'critical' ? r(rep.priority.padEnd(10)) : d((rep.priority||'').padEnd(10));
    console.log(`  ${(rep.title||'').slice(0,28).padEnd(28)} ${sts} ${pri} ${rep.reporter_name || rep.reporter_email || '—'}`);
  });
  hr();
  info(`${data.length} report(s)`);
}

async function updateReportStatus() {
  nl();
  const title = await prompt('Search report by title');
  const { data } = await sb.from('reports').select('id, title, status').ilike('title', `%${title}%`);
  if (!data?.length) { fail('No matching reports.'); return; }

  console.log(`\n  Found: ${b(data[0].title)}  Status: ${y(data[0].status)}`);
  console.log(b('\n  New status:'));
  const newStatus = await choose(REPORT_STATUSES.map((s) => [s, s]));

  const response = await prompt('Admin response (optional)', '');
  if (!await confirm(`Update status to "${newStatus}"?`)) { info('Cancelled.'); return; }

  const update = { status: newStatus, admin_read_at: new Date().toISOString() };
  if (response) update.admin_response = response;

  const { error } = await sb.from('reports').update(update).eq('id', data[0].id);
  if (error) { fail(error.message); return; }
  ok(`Report updated to ${newStatus}.`);
}

async function reportMenu() {
  while (true) {
    banner();
    console.log(b('  Reports\n'));
    const action = await choose([
      ['open',    'View open reports'],
      ['all',     'View all reports'],
      ['update',  'Update report status'],
      ['back',    'Back to main menu'],
    ]);
    if (action === 'back') return;
    if (action === 'open')   await listReports('open');
    if (action === 'all')    await listReports(null);
    if (action === 'update') await updateReportStatus();
    await pause();
  }
}

// =============================================================================
// NOTIFICATIONS / ANNOUNCEMENTS
// =============================================================================

async function postAnnouncement() {
  nl();
  console.log(b('  ── Post Announcement ──'));
  nl();

  const title    = await prompt('Title');
  const message  = await prompt('Message');
  const category = await prompt('Category (Academic / Emergency / Events / etc.)', 'Academic');
  const audience = await choose([
    ['everyone', 'Everyone'],
    ['staff',    'Staff only'],
  ]);

  if (!await confirm(`Post announcement to ${audience}?`)) { info('Cancelled.'); return; }

  const { error } = await sb.from('notifications').insert({
    title,
    message,
    category,
    audience,
    type: category.toLowerCase(),
    posted_by_name: 'Admin CLI',
  });
  if (error) { fail(error.message); return; }
  ok(`Announcement posted.`);
}

// =============================================================================
// STATISTICS
// =============================================================================

async function showStats() {
  nl();
  console.log(b('  ── Database Overview ──'));
  nl();

  const tables = [
    ['users',         'users'],
    ['buildings',     'buildings'],
    ['locations',     'locations'],
    ['departments',   'departments'],
    ['notifications', 'notifications'],
    ['events',        'events'],
    ['reports',       'reports'],
    ['amenities',     'amenities'],
    ['dining',        'dining'],
    ['favourites',    'favourites'],
  ];

  for (const [table, label] of tables) {
    const { count } = await sb.from(table).select('*', { count: 'exact', head: true });
    const bar = '█'.repeat(Math.min(count || 0, 30));
    console.log(`  ${label.padEnd(16)} ${String(count || 0).padStart(5)}  ${c(bar)}`);
  }

  // Users by role
  nl();
  console.log(b('  Users by role:'));
  for (const role of ROLES) {
    const { count } = await sb.from('users').select('*', { count: 'exact', head: true }).eq('role', role);
    const col = role === 'admin' ? r : role === 'faculty' ? y : role === 'student' ? g : d;
    console.log(`    ${col(role.padEnd(10))} ${count || 0}`);
  }

  // Open reports
  const { count: openReps } = await sb.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open');
  nl();
  console.log(`  ${r('Open reports:')}  ${openReps || 0}`);
}

// =============================================================================
// SEED INITIAL DATA
// =============================================================================

async function seedDepartments() {
  const sample = [
    { name: 'Maritime Studies',     category: 'Academic',        operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Engineering',          category: 'Academic',        operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Business Studies',     category: 'Academic',        operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Student Affairs',      category: 'Student Services',operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Registry',             category: 'Administrative',  operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Finance',              category: 'Administrative',  operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Library',              category: 'Facilities',      operating_hours: '8AM – 8PM', availability_status: 'Open' },
    { name: 'IT & Systems',         category: 'Facilities',      operating_hours: '9AM – 5PM', availability_status: 'Open' },
    { name: 'Health Services',      category: 'Student Services',operating_hours: '9AM – 4PM', availability_status: 'Open' },
    { name: 'Security Office',      category: 'Facilities',      operating_hours: '24 hours',  availability_status: 'Open' },
  ];

  if (!await confirm(`Insert ${sample.length} sample departments?`)) { info('Cancelled.'); return; }

  const { error } = await sb.from('departments').upsert(sample, { onConflict: 'name', ignoreDuplicates: true });
  if (error) { fail(error.message); return; }
  ok(`${sample.length} departments seeded.`);
}

async function seedMenu() {
  banner();
  console.log(b('  Seed Initial Data\n'));
  const action = await choose([
    ['depts', 'Seed sample departments (10 RMU departments)'],
    ['back',  'Back to main menu'],
  ]);
  if (action === 'depts') { await seedDepartments(); await pause(); }
}

// =============================================================================
// MAIN MENU
// =============================================================================

async function main() {
  while (true) {
    banner();
    console.log(b('  What would you like to do?\n'));
    const action = await choose([
      ['users',    '👤  User Management      — add, list, update role, reset password'],
      ['depts',    '🏛   Department Management — add, status, delete'],
      ['reports',  '📋  Reports              — view, update status'],
      ['announce', '📢  Post Announcement    — broadcast to users'],
      ['stats',    '📊  Database Statistics  — counts, breakdowns'],
      ['seed',     '🌱  Seed Initial Data    — sample departments'],
      ['exit',     '🚪  Exit'],
    ]);

    if (action === 'exit')     { nl(); console.log(g('  Goodbye!\n')); rl.close(); process.exit(0); }
    if (action === 'users')    await userMenu();
    if (action === 'depts')    await departmentMenu();
    if (action === 'reports')  await reportMenu();
    if (action === 'announce') { await postAnnouncement(); await pause(); }
    if (action === 'stats')    { await showStats(); await pause(); }
    if (action === 'seed')     await seedMenu();
  }
}

main().catch((err) => {
  console.error(r('\n  Fatal error:'), err.message);
  rl.close();
  process.exit(1);
});
