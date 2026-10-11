import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateProjectDocument,
  CreateTaskDocument,
  DeleteProjectDocument,
  DeleteTaskDocument,
  UpdateTaskDocument,
  WorkDocument,
  type TaskFieldsFragment,
} from '@mny/graphql/client';
import { Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { AreaPage } from '../components/AreaPage';
import { Attachments } from '../components/Attachments';
import { PageSkeleton } from '../components/PageSkeleton';
import { TaskDialog } from '../components/TaskDialog';
import { localToday } from '../lib/areas';
import { formatDate } from '../lib/format';

const NO_PROJECT = 'none';

const SUGGESTIONS = [
  'O que eu deveria fazer primeiro hoje?',
  'Crie uma Tarefa para revisar o orçamento até sexta',
  'Quais Tarefas estão atrasadas?',
];

export function WorkPage() {
  const { data, loading } = useQuery(WorkDocument);
  const [createTask] = useMutation(CreateTaskDocument, { refetchQueries: [WorkDocument] });
  const [createProject] = useMutation(CreateProjectDocument, { refetchQueries: [WorkDocument] });
  const [deleteProject] = useMutation(DeleteProjectDocument, { refetchQueries: [WorkDocument] });
  const [filter, setFilter] = useState<string | null>(null);
  const [projectId, setProjectId] = useState(NO_PROJECT);

  if (loading && !data) return <PageSkeleton />;
  const projects = data?.projects ?? [];
  const tasks = (data?.tasks ?? []).filter(task => !filter || task.project?.id === filter);
  const open = tasks.filter(task => task.status !== 'DONE');
  const done = tasks.filter(task => task.status === 'DONE');

  const submitTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const title = String(values.get('title') ?? '').trim();
    if (!title) return;
    await createTask({
      variables: {
        input: {
          dueOn: String(values.get('dueOn') ?? '') || null,
          projectId: projectId === NO_PROJECT ? null : projectId,
          title,
        },
      },
    });
    form.reset();
  };

  const submitProject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') ?? '').trim();
    if (!name) return;
    await createProject({ variables: { name } });
    form.reset();
  };

  return (
    <AreaPage
      area="WORK"
      description="Tarefas com prazo e status, agrupadas por Projeto quando fizer sentido."
      suggestions={SUGGESTIONS}
      title="Trabalho"
    >
      <form className="flex flex-wrap items-center gap-2" onSubmit={submitTask}>
        <Input
          aria-label="Nova Tarefa"
          className="min-w-56 flex-1 bg-card"
          name="title"
          placeholder="O que precisa ser feito?"
          required
        />
        <Input aria-label="Prazo" className="w-auto bg-card" name="dueOn" type="date" />
        {projects.length > 0 && (
          <Select onValueChange={setProjectId} value={projectId}>
            <SelectTrigger aria-label="Projeto" className="w-44 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PROJECT}>Sem Projeto</SelectItem>
              {projects.map(project => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="submit">Adicionar Tarefa</Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>
            Abertas <span className="font-sans text-sm text-muted-foreground">{open.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {open.length ? (
            <TaskList projects={projects} tasks={open} />
          ) : (
            <p className="text-muted-foreground">Nada em aberto{filter ? ' neste Projeto' : ''}.</p>
          )}
        </CardContent>
      </Card>

      {done.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Feitas <span className="font-sans text-sm text-muted-foreground">{done.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TaskList projects={projects} tasks={done.slice(0, 20)} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Projetos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {projects.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setFilter(null)}
                size="sm"
                variant={filter ? 'outline' : 'secondary'}
              >
                Todos
              </Button>
              {projects.map(project => (
                <span className="flex items-center" key={project.id}>
                  <Button
                    onClick={() => setFilter(project.id)}
                    size="sm"
                    variant={filter === project.id ? 'secondary' : 'outline'}
                  >
                    {project.name}
                  </Button>
                  <Button
                    aria-label={`Excluir Projeto ${project.name}`}
                    className="text-muted-foreground"
                    onClick={() => {
                      if (filter === project.id) setFilter(null);
                      void deleteProject({ variables: { id: project.id } });
                    }}
                    size="icon-xs"
                    title="Excluir Projeto (as Tarefas ficam, sem Projeto)"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </span>
              ))}
            </div>
          )}
          <form className="flex flex-wrap items-center gap-2" onSubmit={submitProject}>
            <Input className="w-64 bg-card" name="name" placeholder="Nome do Projeto" required />
            <Button type="submit" variant="outline">
              Criar Projeto
            </Button>
          </form>
        </CardContent>
      </Card>
    </AreaPage>
  );
}

interface TaskListProps {
  projects: { id: string; name: string }[];
  tasks: TaskFieldsFragment[];
}

function TaskList({ projects, tasks }: TaskListProps) {
  const [editing, setEditing] = useState<TaskFieldsFragment | null>(null);
  const [update] = useMutation(UpdateTaskDocument, { refetchQueries: [WorkDocument] });
  const [remove] = useMutation(DeleteTaskDocument, { refetchQueries: [WorkDocument] });
  const today = localToday();

  return (
    <>
      {editing && (
        <TaskDialog onClose={() => setEditing(null)} projects={projects} task={editing} />
      )}
      <ul className="flex flex-col divide-y">
        {tasks.map(task => {
          const isDone = task.status === 'DONE';
          const late = !isDone && task.dueOn != null && task.dueOn < today;
          return (
            <li className="group flex items-start gap-3 py-2.5" key={task.id}>
              <Checkbox
                aria-label={isDone ? 'Reabrir Tarefa' : 'Concluir Tarefa'}
                checked={isDone}
                className="mt-0.5"
                onCheckedChange={checked =>
                  void update({
                    variables: { id: task.id, input: { status: checked ? 'DONE' : 'TODO' } },
                  })
                }
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Button
                    className={cn(
                      'h-auto px-0 py-0 font-normal whitespace-normal text-foreground',
                      isDone && 'text-muted-foreground line-through'
                    )}
                    onClick={() => setEditing(task)}
                    title="Editar Tarefa"
                    variant="link"
                  >
                    {task.title}
                  </Button>
                  {task.status === 'DOING' && <Badge variant="secondary">fazendo</Badge>}
                  {task.project && <Badge variant="outline">{task.project.name}</Badge>}
                </div>
                <Attachments attachments={task.attachments} taskId={task.id} />
              </div>
              {!isDone && (
                <Button
                  className="h-auto px-0 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() =>
                    void update({
                      variables: {
                        id: task.id,
                        input: { status: task.status === 'DOING' ? 'TODO' : 'DOING' },
                      },
                    })
                  }
                  variant="link"
                >
                  {task.status === 'DOING' ? 'pausar' : 'começar'}
                </Button>
              )}
              <span
                className={cn(
                  'w-24 shrink-0 text-right tabular-nums',
                  late ? 'text-destructive' : 'text-muted-foreground'
                )}
                title={late ? 'Atrasada' : undefined}
              >
                {task.dueOn ? formatDate(task.dueOn) : '—'}
              </span>
              <Button
                aria-label="Excluir Tarefa"
                className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => void remove({ variables: { id: task.id } })}
                size="icon-xs"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
