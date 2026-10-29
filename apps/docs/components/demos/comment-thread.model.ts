import threadMock from "./comment-thread.mock.json";

export type Rich =
  | { kind: "sizes"; rows: [string, string, string][] }
  | { kind: "photo"; caption: string };

export interface Comment {
  key: string;
  author: string;
  badge?: string;
  text: string;
  rich?: Rich;
  votes: number;
  voted: boolean;
  age: number;
  typing?: boolean;
  sending?: boolean;
  replies: Comment[];
}

type ApiComment = Omit<Comment, "voted" | "replies" | "rich"> & {
  replies?: ApiComment[];
  rich?: Rich;
};

const hydrate = (comments: ApiComment[]): Comment[] =>
  comments.map(({ replies = [], rich, ...comment }) => ({
    ...comment,
    voted: false,
    ...(rich ? { rich } : {}),
    replies: hydrate(replies),
  }));

export const postThread = () =>
  hydrate(threadMock.postThread as ApiComment[]);
export const previewThread = () =>
  hydrate(threadMock.homePreview as ApiComment[]);

export const makeComment = (
  key: string,
  author: string,
  text: string,
  votes: number,
  age: number,
  extra: Partial<Comment> = {},
): Comment => ({
  key,
  author,
  text,
  votes,
  voted: false,
  age,
  replies: [],
  ...extra,
});

export const updateComment = (
  comments: Comment[],
  key: string,
  update: (comment: Comment) => Comment,
): Comment[] =>
  comments.map((comment) =>
    comment.key === key
      ? update(comment)
      : { ...comment, replies: updateComment(comment.replies, key, update) },
  );

export const countComments = (comments: Comment[]): number =>
  comments.reduce(
    (count, comment) =>
      count + (comment.typing ? 0 : 1) + countComments(comment.replies),
    0,
  );

export const sortComments = (
  comments: Comment[],
  sort: "Top" | "Newest",
): Comment[] => {
  const order =
    sort === "Top"
      ? (a: Comment, b: Comment) => b.votes - a.votes
      : (a: Comment, b: Comment) => a.age - b.age;

  return [...comments]
    .sort(
      (a, b) =>
        Number(Boolean(a.typing)) - Number(Boolean(b.typing)) || order(a, b),
    )
    .map((comment) => ({
      ...comment,
      replies: sortComments(comment.replies, sort),
    }));
};

export const commentTrail = (
  comments: Comment[],
  key: string,
  path: string[] = [],
): string[] | null => {
  for (const comment of comments) {
    if (comment.key === key) return [...path, comment.key];
    const trail = commentTrail(comment.replies, key, [...path, comment.key]);
    if (trail) return trail;
  }
  return null;
};

export const addTypingComment =
  (parent: string | null, key: string, author: string, badge?: string) =>
  (comments: Comment[]) => {
    const bubble = makeComment(key, author, "", 0, 0, {
      typing: true,
      ...(badge ? { badge } : {}),
    });
    return parent === null
      ? [...comments, bubble]
      : updateComment(comments, parent, (comment) => ({
          ...comment,
          replies: [...comment.replies, bubble],
        }));
  };

export const sendTypingComment =
  (key: string, text: string, votes = 0) =>
  (comments: Comment[]) =>
    updateComment(comments, key, (comment) => ({
      ...comment,
      typing: false,
      text,
      votes,
    }));

export const addVotes =
  (...keys: string[]) =>
  (comments: Comment[]) =>
    keys.reduce(
      (next, key) =>
        updateComment(next, key, (comment) => ({
          ...comment,
          votes: comment.votes + 1,
        })),
      comments,
    );
