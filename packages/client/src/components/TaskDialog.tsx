import { useMutation } from '@apollo/client/react';
import { UpdateTaskDocument, WorkDocument, type TaskFieldsFragment } from '@mny/graphql/client';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { FormError } from './FormError';

const NO_PROJECT = 'none';

interface Props {
  onClose: () => void;
  projects: { id: string; name: string }[];
  task: TaskFieldsFragment;
}

/** Edits a Task's title, deadline and Project. */
export function TaskDialog({ onClose, projects, task }: Props) {
  const [update, { error, loading }] = useMutation(UpdateTaskDocument, {
    refetchQueries: [WorkDocument],
  });
  const [projectId, setProjectId] = useState(task.project?.id ?? NO_PROJECT);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    await update({
      variables: {
        id: task.id,
        input: {
          dueOn: String(values.get('dueOn') ?? '') || null,
          projectId: projectId === NO_PROJECT ? null : projectId,
          title: String(values.get('title') ?? ''),
        },
      },
    })
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl font-normal">Editar Tarefa</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input defaultValue={task.title} id="task-title" name="title" required />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-due">Prazo</Label>
              <Input
                className="w-auto"
                defaultValue={task.dueOn ?? ''}
                id="task-due"
                name="dueOn"
                type="date"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Projeto</Label>
              <Select onValueChange={setProjectId} value={projectId}>
                <SelectTrigger aria-label="Projeto" className="w-52">
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
            </div>
          </div>
          {error && <FormError message={error.message} />}
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              Cancelar
            </Button>
            <Button disabled={loading} type="submit">
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
