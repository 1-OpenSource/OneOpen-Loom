import type { FormEvent } from "react";
import { useState } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import type { WorkItemCreate, WorkItemPriority, WorkItemStageStatus, WorkItemType } from "../../types/workItem";
import { workItemPriorityOptions, workItemTypeOptions } from "../../utils/workItemOptions";
import { getApiErrorMessage } from "../../utils/getApiErrorMessage";

export default function CreateWorkItemModal({
  isOpen,
  onClose,
  onCreate,
  defaultStatus = "TODO",
  title: modalTitle = "Create Work Item"
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: WorkItemCreate) => Promise<void>;
  defaultStatus?: WorkItemStageStatus;
  title?: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<WorkItemType>("TASK");
  const [priority, setPriority] = useState<WorkItemPriority>("MEDIUM");
  const [storyPoints, setStoryPoints] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createAnother, setCreateAnother] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      await onCreate({
        title,
        description: description || null,
        type,
        status: defaultStatus,
        priority,
        story_points: storyPoints ? Number(storyPoints) : null,
        due_date: dueDate || null
      });
      if (createAnother) {
        setTitle("");
        setDescription("");
        setStoryPoints("");
        setDueDate("");
        setType("TASK");
        setPriority("MEDIUM");
      } else {
        onClose();
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create work item"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} title={modalTitle} onClose={onClose}>
      <form className="form-stack" onSubmit={handleSubmit}>
        {error ? <div className="error-banner">{error}</div> : null}
        <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <label className="field" htmlFor="work-item-description">
          <span>Description</span>
          <textarea
            id="work-item-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        <div className="form-grid">
          <Select
            label="Type"
            options={workItemTypeOptions}
            value={type}
            onChange={(event) => setType(event.target.value as WorkItemType)}
          />
          <Select
            label="Priority"
            options={workItemPriorityOptions}
            value={priority}
            onChange={(event) => setPriority(event.target.value as WorkItemPriority)}
          />
        </div>
        <div className="form-grid">
          <Input
            label="Story Points"
            type="number"
            min="0"
            value={storyPoints}
            onChange={(event) => setStoryPoints(event.target.value)}
          />
          <Input label="Due Date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
        </div>
        <label className="checkbox-field">
          <input type="checkbox" checked={createAnother} onChange={(event) => setCreateAnother(event.target.checked)} />
          <span>Create another after save</span>
        </label>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}
