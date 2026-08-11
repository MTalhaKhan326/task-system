type Comment = {
  id: string;
  body: string;
  created_at: string;
  members: { full_name: string | null; email: string } | null;
};

export function CommentThread({
  taskId,
  actionBasePath,
  comments,
}: {
  taskId: string;
  actionBasePath: string;
  comments: Comment[];
}) {
  return (
    <div className="mt-3 border-t border-cream-dark pt-3">
      <p className="mb-2 text-xs font-medium uppercase text-ink/50">Comments</p>
      <div className="mb-3 flex flex-col gap-2">
        {comments.length === 0 && <p className="text-xs text-ink/50">No comments yet.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="text-sm">
            <span className="font-medium text-ink/80">
              {comment.members?.full_name ?? comment.members?.email ?? "Unknown"}
            </span>{" "}
            <span className="text-xs text-ink/50">
              {new Date(comment.created_at).toLocaleString()}
            </span>
            <p className="text-ink/80">{comment.body}</p>
          </div>
        ))}
      </div>

      <form action={`${actionBasePath}/${taskId}/comments`} method="POST" className="flex gap-2">
        <textarea
          name="body"
          required
          rows={2}
          placeholder="Add a comment"
          className="flex-1 rounded border border-cream-dark px-2 py-1 text-sm text-ink"
        />
        <button
          type="submit"
          className="self-end rounded border border-cream-dark px-3 py-1 text-sm text-ink/80 hover:bg-cream-mid"
        >
          Post
        </button>
      </form>
    </div>
  );
}
