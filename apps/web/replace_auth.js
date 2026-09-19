const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('app/api');

let changed = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('getServerSession')) {
    // 1. replace imports
    content = content.replace(/import\s*\{\s*getServerSession\s*\}\s*from\s*['"]next-auth.*?['"];?\n?/g, '');
    content = content.replace(/import\s*\{\s*authOptions\s*\}\s*from\s*['"]@\/lib\/server\/authOptions['"];?\n?/g, '');
    
    if (!content.includes('import { createClient } from "@/utils/supabase/server"')) {
      content = 'import { createClient } from "@/utils/supabase/server";\n' + content;
    }

    // 2. replace usage
    content = content.replace(/const\s+session\s*=\s*await\s+getServerSession\([^)]*\);?/g, 
      'const supabase = await createClient();\n    const { data: { user } } = await supabase.auth.getUser();');

    // 3. replace session.user fields
    content = content.replace(/session\?\.user\?\.email/g, 'user?.email');
    content = content.replace(/session\?\.user\?\.name/g, 'user?.user_metadata?.name');
    content = content.replace(/session\?\.user\?\.id/g, 'user?.id');
    content = content.replace(/session\?\.user/g, 'user');

    fs.writeFileSync(file, content, 'utf8');
    changed++;
    console.log('Modified: ' + file);
  }
});
console.log('Total files changed: ' + changed);
