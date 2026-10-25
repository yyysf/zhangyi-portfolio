// 从 dist/ 生成可发布到 GitHub Pages 的 gh-pages 分支。
// 站点文件位于该分支根层（index.html 在根），并注入 .nojekyll 跳过 Jekyll 处理。
// 用法：npm run deploy:pages  → 然后 git push origin gh-pages

import { execFileSync } from 'node:child_process';
import { rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('..', import.meta.url));
const dist = join(repo, 'dist');
const branch = 'gh-pages';

const git = (args, options = {}) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', ...options }).trim();

const gitInDist = (args, env) =>
  execFileSync('git', args, { cwd: dist, encoding: 'utf8', env }).trim();

const tryGit = (args) => {
  try {
    return git(args);
  } catch {
    return null;
  }
};

if (!statSync(join(dist, 'index.html')).isFile()) {
  throw new Error('dist/index.html 不存在，无法生成发布分支。');
}

const dirty = git(['status', '--porcelain', '--', 'dist']);
if (dirty) {
  console.warn('注意：dist 有未提交改动，gh-pages 会包含这些改动，但提交记录里没有对应源码。');
}

const gitDir = git(['rev-parse', '--absolute-git-dir']);
const indexPath = join(gitDir, `pages-index-${process.pid}`);
const env = { ...process.env, GIT_INDEX_FILE: indexPath, GIT_WORK_TREE: dist };

try {
  git(['read-tree', '--empty'], { env });
  gitInDist(['-c', 'core.autocrlf=false', 'add', '-A', '--', '.'], env);

  const nojekyll = git(['hash-object', '-w', '--stdin'], { input: '' });
  git(['update-index', '--add', '--cacheinfo', `100644,${nojekyll},.nojekyll`], { env });

  const tree = git(['write-tree'], { env });
  const parent = tryGit(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]);
  const source = tryGit(['rev-parse', '--short', 'HEAD']) || 'unknown';
  const message = `Deploy dist from ${source}`;
  const commit = git(
    ['commit-tree', tree, ...(parent ? ['-p', parent] : []), '-m', message],
  );
  git(['update-ref', `refs/heads/${branch}`, commit]);

  const files = git(['ls-tree', '-r', '--name-only', branch]).split('\n').filter(Boolean);
  console.log(`${branch} 已生成：${commit.slice(0, 7)}，共 ${files.length} 个文件。`);
  console.log('下一步：git push origin ' + branch + ' --force-with-lease（首次推送可省略参数）');
} finally {
  rmSync(indexPath, { force: true });
}
