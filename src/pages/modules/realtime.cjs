const fs = require('fs');
const path = require('path');
const dir = __dirname;

const modules = {
  'Tasks.tsx': 'tasks',
  'Todos.tsx': 'todos',
  'Kanban.tsx': 'kanban_cards',
  'Finance.tsx': 'transactions',
  'Invoices.tsx': 'invoices',
  'Reminders.tsx': 'reminders',
  'Calendar.tsx': 'calendar_events',
  'Vault.tsx': 'credentials_vault',
  'Docs.tsx': 'docs'
};

for (const [file, table] of Object.entries(modules)) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Add useAuth import if not exists
  if (!content.includes('useAuth')) {
    content = content.replace(
      /import \{ supabase \} from '\.\.\/\.\.\/lib\/supabase';/g,
      "import { supabase } from '../../lib/supabase';\nimport { useAuth } from '../../hooks/useAuth';"
    );
  }

  // Inside the main component, add `const { user } = useAuth();` if not exists
  // First, find the component name
  const componentMatch = content.match(/export default function ([a-zA-Z0-9_]+)\(\) \{/);
  if (componentMatch) {
    const componentName = componentMatch[1];
    if (!content.includes('const { user } = useAuth();')) {
      content = content.replace(
        new RegExp(`export default function ${componentName}\\(\\) \\{`),
        `export default function ${componentName}() {\n  const { user } = useAuth();`
      );
    }
  }

  // Find the existing fetch function name
  let fetchFnName = 'fetchData'; // default
  if (file === 'Tasks.tsx') fetchFnName = 'fetchTasks';
  else if (file === 'Todos.tsx') fetchFnName = 'fetchTodos';
  else if (file === 'Kanban.tsx') fetchFnName = 'fetchBoard';
  else if (file === 'Finance.tsx') fetchFnName = 'fetchTransactions';
  else if (file === 'Invoices.tsx') fetchFnName = 'fetchInvoices';
  else if (file === 'Reminders.tsx') fetchFnName = 'fetchReminders';
  else if (file === 'Calendar.tsx') fetchFnName = 'fetchEvents';
  else if (file === 'Vault.tsx') fetchFnName = 'fetchCredentials';
  else if (file === 'Docs.tsx') fetchFnName = 'fetchDocs';

  // Find existing useEffect for initial fetch and replace it
  const useEffectRegex = new RegExp(`useEffect\\(\\(\\) => \\{\\s+${fetchFnName}\\(\\);\\s+\\}, \\[\\]\\);`, 's');
  
  const replacement = `useEffect(() => {
    if (!user?.id) return;
    
    ${fetchFnName}();
    
    const channel = supabase
      .channel('module-${table}-' + user.id)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: '${table}',
        ${table === 'kanban_cards' ? '' : 'filter: `user_id=eq.${user.id}`,'}
      }, () => {
        ${fetchFnName}();
      })
      .subscribe();
      
    return () => {
      channel.unsubscribe();
    }
  }, [user?.id]);`;

  if (useEffectRegex.test(content)) {
    content = content.replace(useEffectRegex, replacement);
  } else {
    // Maybe it's missing or different, let's just log
    console.log(`Could not find standard useEffect in ${file}`);
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
