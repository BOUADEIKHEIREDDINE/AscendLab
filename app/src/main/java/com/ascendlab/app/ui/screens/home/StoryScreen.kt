package com.ascendlab.app.ui.screens.home

import android.text.format.DateUtils
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.ui.components.Avatar
import com.ascendlab.app.ui.components.MealCover
import com.ascendlab.app.ui.components.MealPhoto
import com.ascendlab.app.ui.components.WorkoutCover
import com.ascendlab.app.ui.components.rememberHaptics
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/** Posts already watched as stories in this session, so their ring turns grey. */
object StorySeen {
    private val _ids = MutableStateFlow<Set<String>>(emptySet())
    val ids: StateFlow<Set<String>> = _ids
    fun mark(id: String) { _ids.value = _ids.value + id }
}

private const val STORY_MS = 5_000L
private const val FRAME_MS = 50L

/**
 * Full-screen story: someone's posts from the last 24 hours, one after the other.
 * Tap the right side for next, the left side for previous, hold to pause, swipe down to close.
 */
@Composable
fun StoryScreen(navController: NavHostController, uid: String, vm: FeedViewModel = viewModel()) {
    val feed by vm.feed.collectAsStateWithLifecycle()
    val haptics = rememberHaptics()
    val cutoff = remember { System.currentTimeMillis() - 24L * 3600 * 1000 }
    val posts = remember(feed.posts) { feed.posts.filter { it.uid == uid && it.createdAt.time >= cutoff }.sortedBy { it.createdAt } }
    var index by remember { mutableIntStateOf(0) }
    var elapsed by remember { mutableFloatStateOf(0f) }
    var paused by remember { mutableStateOf(false) }

    fun close() { navController.popBackStack() }

    // Timer for the current story; moves on (or closes) when it runs out.
    LaunchedEffect(index, posts.size, paused) {
        if (posts.isEmpty()) return@LaunchedEffect
        posts.getOrNull(index)?.let { StorySeen.mark(it.id) }
        while (!paused && elapsed < 1f) {
            delay(FRAME_MS)
            elapsed += FRAME_MS.toFloat() / STORY_MS
        }
        if (!paused && elapsed >= 1f) {
            if (index < posts.lastIndex) { index++; elapsed = 0f } else close()
        }
    }

    Box(
        Modifier.fillMaxSize().background(Color.Black)
            .pointerInput(posts.size) {
                detectTapGestures(
                    onTap = { pos ->
                        haptics.tick()
                        if (pos.x > size.width / 3) {
                            if (index < posts.lastIndex) { index++; elapsed = 0f } else close()
                        } else if (index > 0) { index--; elapsed = 0f } else elapsed = 0f
                    },
                    onPress = { paused = true; tryAwaitRelease(); paused = false },
                )
            }
            .pointerInput(Unit) {
                detectVerticalDragGestures { _, drag -> if (drag > 40) close() }
            },
    ) {
        val post = posts.getOrNull(index)
        // Meals without a photo already show their name on the cover.
        val caption = post?.takeIf { !(it.isMeal && it.photo == null) }?.description?.takeIf { it.isNotBlank() }
        if (post != null) {
            // Tall, rounded card filling the screen under the header, like a phone-sized story.
            AnimatedContent(
                post, transitionSpec = { fadeIn() togetherWith fadeOut() }, label = "story",
                // The caption sits under the card, never over the cover's own text.
                modifier = Modifier.fillMaxSize().padding(top = 76.dp, bottom = if (caption != null) 88.dp else 16.dp).clip(RoundedCornerShape(16.dp)),
            ) { p ->
                Box(Modifier.fillMaxSize()) {
                    when {
                        p.photo != null -> MealPhoto(p.photo, Modifier.matchParentSize())
                        p.workout != null -> WorkoutCover(p.workout, Modifier.matchParentSize())
                        else -> MealCover(p, Modifier.matchParentSize())
                    }
                }
            }
        }

        Column(Modifier.fillMaxWidth().padding(top = 12.dp)) {
            // One bar per post: full for seen, filling for the current one, empty for the rest.
            Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                posts.indices.forEach { i ->
                    val fill = when {
                        i < index -> 1f
                        i == index -> elapsed.coerceIn(0f, 1f)
                        else -> 0f
                    }
                    Box(Modifier.weight(1f).height(3.dp).clip(RoundedCornerShape(2.dp)).background(Color.White.copy(alpha = 0.35f))) {
                        Box(Modifier.fillMaxHeight().fillMaxWidth(fill).background(Color.White))
                    }
                }
            }
            post?.let { p ->
                Row(Modifier.fillMaxWidth().padding(start = 12.dp, end = 4.dp, top = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Avatar(p.authorName, p.uid, size = 34)
                    Text(p.authorName, style = MaterialTheme.typography.titleSmall, color = Color.White, modifier = Modifier.padding(start = 10.dp))
                    Text(
                        "  " + DateUtils.getRelativeTimeSpanString(p.createdAt.time, System.currentTimeMillis(), DateUtils.MINUTE_IN_MILLIS, DateUtils.FORMAT_ABBREV_RELATIVE),
                        style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.7f), modifier = Modifier.weight(1f),
                    )
                    IconButton(onClick = { close() }) { Icon(Icons.Filled.Close, "Close", tint = Color.White) }
                }
            }
        }

        caption?.let { caption ->
            Text(
                caption,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White,
                maxLines = 2,
                modifier = Modifier.align(Alignment.BottomCenter).fillMaxWidth().padding(horizontal = 20.dp, vertical = 26.dp),
            )
        }
    }
}
