import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { MealPhotos } from '../../../data/mealPhotos';
import { Comment, FeedPost } from '../../../data/social';
import { feedLive, listenComments, listenPost, meStore, SocialRepository } from '../../../data/socialRepo';
import { useLiveQuery, useStore } from '../../../lib/store';
import { goBack, useNav, useParams } from '../../../navigation/types';
import { palette, Gutter, type, withAlpha } from '../../theme';
import { haptics } from '../../haptics';
import { timeAgo } from '../../format';
import { Avatar, Hairline, IconButton, PageHeader, Screen, SkeletonCard, T } from '../../components/core';
import { ShapeLoader } from '../../shapes/ShapeLoader';
import { MealPhoto, PostCard } from '../../components/feed';
import { ActionMenu } from '../../components/overlays';

export function CommentsScreen() {
  const nav = useNav();
  const { postId } = useParams<'Comments'>();
  const feed = useStore(feedLive);
  const me = useStore(meStore);
  const myUid = me?.uid ?? SocialRepository.uid;
  const direct = useLiveQuery<FeedPost | null>(postId, null, (emit) => listenPost(postId, emit));
  const post = direct ?? feed.posts.find((p) => p.id === postId) ?? null;
  const comments = useLiveQuery<Comment[] | null>(postId, null, (emit) => listenComments(postId, emit));
  const list = useRef<FlatList<Comment>>(null);
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the newest comment in view when one arrives.
  useEffect(() => {
    if (comments?.length) setTimeout(() => list.current?.scrollToEnd({ animated: true }), 100);
  }, [comments?.length]);

  async function pick() {
    setPreparing(true);
    const result = await MealPhotos.pick();
    setPreparing(false);
    if (result && 'photo' in result) setPhoto(result.photo);
    else if (result) setError(result.error);
  }

  async function send() {
    if (!post) return;
    setSending(true);
    const failure = await SocialRepository.addComment(post, text, photo);
    setSending(false);
    if (failure == null) { haptics.confirm(); setText(''); setPhoto(null); } else { haptics.reject(); setError(failure); }
  }

  const canSend = post != null && !sending && !preparing && (text.trim() !== '' || photo != null);

  return (
    <Screen keyboard>
      <PageHeader title="Comments" onBack={() => goBack(nav)} />
      <FlatList
        ref={list}
        style={{ flex: 1 }}
        data={comments ?? []}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ paddingBottom: 12 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {post ? (
              <>
                <PostCard post={post} myUid={myUid} onLike={() => SocialRepository.toggleLike(post)}
                  onDelete={() => { SocialRepository.deletePost(post); goBack(nav); }} />
                <Hairline style={{ marginTop: 8 }} />
              </>
            ) : feed.loading ? <SkeletonCard /> : null}
            {comments == null ? <SkeletonCard />
              : comments.length === 0 ? <T color={palette.textMuted} style={{ paddingHorizontal: Gutter, paddingVertical: 20 }}>No comments yet. Say something nice.</T> : null}
          </View>
        }
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            isMine={item.uid === myUid}
            canDelete={item.uid === myUid || post?.uid === myUid}
            onDelete={() => post && SocialRepository.deleteComment(post, item)}
          />
        )}
      />

      <Hairline />
      {photo && (
        <View style={{ paddingLeft: Gutter, paddingTop: 10, flexDirection: 'row' }}>
          <View>
            <MealPhoto photo={photo} style={{ width: 72, height: 72, borderRadius: 10 }} />
            <Pressable onPress={() => setPhoto(null)} accessibilityLabel="Remove photo"
              style={{ position: 'absolute', top: -8, right: -8, width: 28, height: 28, borderRadius: 14, backgroundColor: withAlpha(palette.ink, 0.85), alignItems: 'center', justifyContent: 'center' }}>
              <T v="label">×</T>
            </Pressable>
          </View>
        </View>
      )}
      {error && <T v="bodyS" color={palette.error} style={{ paddingHorizontal: Gutter }}>{error}</T>}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8, gap: 4 }}>
        {preparing ? <View style={{ width: 44, alignItems: 'center' }}><ShapeLoader size={28} /></View>
          : <IconButton name="image" label="Add a photo" color={palette.lime} onPress={pick} disabled={post == null} />}
        <TextInput
          value={text}
          onChangeText={(t) => { setText(t.slice(0, 500)); setError(null); }}
          placeholder="Add a comment…"
          placeholderTextColor={palette.textMuted}
          multiline
          autoCapitalize="sentences"
          selectionColor={palette.lime}
          keyboardAppearance="dark"
          accessibilityLabel="Add a comment"
          style={[type.body, { flex: 1, color: palette.text, backgroundColor: palette.surface, borderRadius: 24, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 48, maxHeight: 120 }]}
        />
        <IconButton name="send" label="Send" color={canSend ? palette.lime : palette.textMuted} onPress={send} disabled={!canSend} />
      </View>
    </Screen>
  );
}

function CommentRow({ comment, isMine, canDelete, onDelete }: { comment: Comment; isMine: boolean; canDelete: boolean; onDelete: () => void }) {
  const [menu, setMenu] = useState(false);
  return (
    <View style={{ flexDirection: 'row', paddingLeft: Gutter, paddingRight: 4, paddingVertical: 10 }}>
      <Avatar name={comment.authorName} seed={comment.uid} size={32} />
      <View style={{ flex: 1, marginLeft: 12, gap: 6 }}>
        <T v="bodyS">
          <T v="bodyS" style={{ fontWeight: '600' }}>{isMine ? 'You' : comment.authorName}</T>
          <T v="bodyS" color={palette.textMuted}>{'  '}{timeAgo(comment.createdAt.getTime(), true)}</T>
        </T>
        {comment.text.trim() ? <T>{comment.text}</T> : null}
        {comment.photo && <MealPhoto photo={comment.photo} style={{ width: 180, height: 180, borderRadius: 12 }} />}
      </View>
      {canDelete && <IconButton name="close" size={16} color={palette.textMuted} label="Comment options" onPress={() => setMenu(true)} />}
      <ActionMenu visible={menu} onDismiss={() => setMenu(false)} items={[{ label: 'Delete comment', icon: 'delete-outline', danger: true, onPress: onDelete }]} />
    </View>
  );
}
