import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface CreateRepoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: { name: string; description: string },
    files: File[]
  ) => void;
}

export function CreateRepoDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateRepoDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ name, description }, files);
    setName('');
    setDescription('');
    setFiles([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle>Create Local Repository</DialogTitle>
          <DialogDescription>
            Create a new repository and upload your files
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Repository Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-project"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="files">Files</Label>
              <Input
                id="files"
                type="file"
                multiple
                className="bg-zinc-800 border-zinc-700"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Create Repository</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
