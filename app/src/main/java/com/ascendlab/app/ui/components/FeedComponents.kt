package com.ascendlab.app.ui.components

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.unit.sp
import androidx.compose.material.icons.automirrored.outlined.Send
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import android.text.format.DateUtils
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.FavoriteBorder
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.ascendlab.app.data.FeedPost
import com.ascendlab.app.data.MealPhotos
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.Standing
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.WorkoutInfo
import com.ascendlab.app.data.WorkoutMath
import com.ascendlab.app.ui.theme.Apricot
import kotlinx.coroutines.delay
import kotlin.math.abs

/**
 * Layout rule for the whole app: content sits directly on the background, edge to edge,
 * separated by hairlines and space, never boxed in cards. [Gutter] is the one side margin.
 */
val Gutter = 20.dp

private val avatarColors = listOf(
    Color(0xFF75E2BE), Color(0xFFFFB987), Color(0xFF8EC5FF), Color(0xFFE0A3FF), Color(0xFFFFE08A),
)

@Composable
fun Avatar(name: String, seed: String, size: Int = 40) {
    val color = avatarColors[abs(seed.hashCode()) % avatarColors.size]
    Box(
        Modifier.size(size.dp).background(color, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            name.trim().firstOrNull()?.uppercase() ?: "?",
            style = when {
                size >= 64 -> MaterialTheme.typography.headlineSmall
                size >= 40 -> MaterialTheme.typography.titleMedium
                else -> MaterialTheme.typography.labelLarge
            },
            color = Color(0xFF101820),
            fontWeight = FontWeight.Bold,
        )
    }
}

/** Full-width hairline between items and sections. */
@Composable
fun Hairline(modifier: Modifier = Modifier) {
    HorizontalDivider(modifier, thickness = 0.5.dp, color = MaterialTheme.colorScheme.outline)
}

/** A flat group of content: no background, no border. Kept as one name so layouts stay consistent. */
@Composable
fun FeedCard(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Column(modifier.fillMaxWidth()) { content() }
}

/** Today's calories as a headline number with a slim bar, then protein, then an optional action. */
@Composable
fun TodayCard(
    eaten: Int,
    target: Int,
    mealCount: Int,
    protein: Int = 0,
    proteinTarget: Int = 0,
    action: (@Composable () -> Unit)? = null,
) {
    val progress by animateFloatAsState(
        if (target > 0) (eaten.toFloat() / target).coerceIn(0f, 1f) else 0f,
        animationSpec = tween(700), label = "today progress",
    )
    Column(Modifier.padding(horizontal = Gutter, vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(verticalAlignment = Alignment.Bottom) {
            CountingNumber(eaten, style = MaterialTheme.typography.displaySmall, color = MaterialTheme.colorScheme.onSurface)
            Text(
                if (target > 0) " / ${formatKcal(target)} kcal" else " kcal",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(bottom = 6.dp).weight(1f),
            )
            if (target > 0) {
                val left = target - eaten
                Text(
                    if (left >= 0) "${formatKcal(left)} left" else "${formatKcal(-left)} over",
                    style = MaterialTheme.typography.titleSmall,
                    color = if (left >= 0) MaterialTheme.colorScheme.primary else Apricot,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }
        }
        if (target > 0) {
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.fillMaxWidth().height(6.dp).clip(CircleShape),
                color = if (eaten > target) Apricot else MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceContainerHigh,
                drawStopIndicator = {},
            )
        }
        Text(
            buildString {
                append("$mealCount ${plural(mealCount, "meal")}")
                if (proteinTarget > 0) append("  ·  $protein / $proteinTarget g protein")
            },
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        action?.invoke()
    }
}

/** The daily race: whoever lands closest to their own calorie goal wins the day. */
@Composable
fun RaceCard(today: List<Standing>, yesterdayWinner: Standing?, myUid: String?) {
    Column {
        SectionTitle("Closest to goal today")
        if (yesterdayWinner != null) {
            Text(
                "Yesterday: ${if (yesterdayWinner.uid == myUid) "you" else yesterdayWinner.name} won, ${gapLabel(yesterdayWinner.gap)}",
                style = MaterialTheme.typography.bodySmall,
                color = Apricot,
                modifier = Modifier.padding(horizontal = Gutter, vertical = 2.dp),
            )
        }
        if (today.isEmpty()) {
            Text(
                "No meals logged yet today.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = Gutter, vertical = 10.dp),
            )
        }
        today.forEachIndexed { i, s ->
            val isMe = s.uid == myUid
            Row(
                Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "${i + 1}",
                    style = MaterialTheme.typography.titleMedium,
                    color = if (i == 0) Apricot else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.width(22.dp),
                )
                Avatar(s.name, s.uid, size = 32)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        if (isMe) "You" else s.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = if (isMe) FontWeight.SemiBold else FontWeight.Normal,
                        maxLines = 1, overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${formatKcal(s.eaten)} of ${formatKcal(s.target)} kcal",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    gapLabel(s.gap),
                    style = MaterialTheme.typography.labelLarge,
                    color = if (s.distance <= ON_TARGET) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private const val ON_TARGET = 50

fun gapLabel(gap: Int): String = when {
    abs(gap) <= ON_TARGET -> "on target"
    gap < 0 -> "${formatKcal(-gap)} under"
    else -> "${formatKcal(gap)} over"
}

fun plural(n: Int, word: String) = if (n == 1) word else "${word}s"

/**
 * One post, laid out like Instagram: author row, a square picture edge to edge (the meal
 * photo, or a generated cover when there's none), actions, likes, caption, comments, time.
 * Double-tap the picture to like.
 */
@Composable
fun PostCard(
    post: FeedPost,
    myUid: String?,
    onLike: () -> Unit,
    onDelete: () -> Unit,
    modifier: Modifier = Modifier,
    onComment: (() -> Unit)? = null,
) {
    val liked = myUid != null && myUid in post.likes
    val haptics = rememberHaptics()
    val context = androidx.compose.ui.platform.LocalContext.current
    var menu by remember { mutableStateOf(false) }
    var burst by remember { mutableStateOf(false) }

    Column(modifier.fillMaxWidth().padding(bottom = 16.dp)) {
        Row(Modifier.padding(start = 12.dp, end = 4.dp, top = 6.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Avatar(post.authorName, post.uid, size = 34)
            Column(Modifier.weight(1f).padding(start = 10.dp)) {
                Text(post.authorName, style = MaterialTheme.typography.titleSmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(
                    if (post.workout != null) "Workout" else post.mealType.label,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            if (post.uid == myUid) {
                Box {
                    IconButton(onClick = { menu = true }) {
                        Icon(Icons.Filled.MoreHoriz, "More", tint = MaterialTheme.colorScheme.onSurface)
                    }
                    DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                        DropdownMenuItem(text = { Text("Delete") }, onClick = { menu = false; onDelete() })
                    }
                }
            }
        }

        // The picture: photo if there is one, otherwise a cover made from the numbers.
        Box(
            Modifier.fillMaxWidth().aspectRatio(1f).pointerInput(post.id) {
                detectTapGestures(onDoubleTap = {
                    if (!liked) onLike()
                    haptics.confirm()
                    burst = true
                })
            },
            contentAlignment = Alignment.Center,
        ) {
            when {
                post.photo != null -> MealPhoto(post.photo, Modifier.matchParentSize())
                post.workout != null -> WorkoutCover(post.workout, Modifier.matchParentSize())
                else -> MealCover(post, Modifier.matchParentSize())
            }
            LaunchedEffect(burst) { if (burst) { delay(700); burst = false } }
            val burstScale by animateFloatAsState(
                if (burst) 1f else 0f, spring(Spring.DampingRatioMediumBouncy), label = "like burst",
            )
            if (burstScale > 0.01f) {
                Icon(
                    Icons.Filled.Favorite, null,
                    tint = Color.White.copy(alpha = burstScale.coerceIn(0f, 1f) * 0.9f),
                    modifier = Modifier.size(96.dp).scale(burstScale),
                )
            }
        }

        Row(Modifier.padding(start = 4.dp, end = 12.dp), verticalAlignment = Alignment.CenterVertically) {
            val heartScale by animateFloatAsState(
                if (liked) 1.15f else 1f,
                spring(Spring.DampingRatioHighBouncy), label = "heart",
            )
            IconButton(onClick = { if (liked) haptics.tick() else haptics.confirm(); onLike() }) {
                Icon(
                    if (liked) Icons.Filled.Favorite else Icons.Filled.FavoriteBorder,
                    contentDescription = if (liked) "Unlike" else "Like",
                    tint = if (liked) Color(0xFFFF5A6E) else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(26.dp).scale(heartScale),
                )
            }
            if (onComment != null) {
                IconButton(onClick = { haptics.tick(); onComment() }) {
                    Icon(Icons.Outlined.ChatBubbleOutline, contentDescription = "Comment", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
                }
            }
            IconButton(onClick = { haptics.tick(); sharePost(context, post) }) {
                Icon(Icons.AutoMirrored.Outlined.Send, contentDescription = "Share", tint = MaterialTheme.colorScheme.onSurface, modifier = Modifier.size(24.dp))
            }
            Spacer(Modifier.weight(1f))
            if (post.isMeal && post.photo != null) {
                // With a photo the numbers aren't on the picture, so they sit here.
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)) {
                            append("${formatKcal(post.calories)} kcal")
                        }
                        if (post.protein > 0) {
                            withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) { append("  ·  ${post.protein} g protein") }
                        }
                    },
                    style = MaterialTheme.typography.labelLarge,
                )
            }
        }

        Column(Modifier.padding(horizontal = 14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            if (post.likes.isNotEmpty()) {
                Text("${post.likes.size} ${plural(post.likes.size, "like")}", style = MaterialTheme.typography.titleSmall)
            }
            // A meal without a photo already shows its name on the cover, so don't repeat it.
            val caption = if (post.isMeal && post.photo == null) "" else post.description
            if (caption.isNotBlank()) {
                Text(
                    buildAnnotatedString {
                        withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(post.authorName) }
                        append("  ")
                        append(caption)
                    },
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            if (onComment != null && post.commentCount > 0) {
                Text(
                    if (post.commentCount == 1) "View 1 comment" else "View all ${post.commentCount} comments",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.pressable(onClick = onComment),
                )
            }
            Text(timeAgo(post), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

private fun sharePost(context: android.content.Context, post: FeedPost) {
    val text = post.workout?.let { w ->
        "${post.authorName} finished \"${w.title}\" on AscendLab: ${WorkoutMath.formatDuration(w.durationSec)}, ${w.sets} sets" +
            if (w.records > 0) ", ${w.records} personal records!" else "."
    } ?: "${post.authorName} logged ${post.mealType.label.lowercase()} on AscendLab: ${post.description.ifBlank { "a meal" }}, ${post.calories} kcal."
    val send = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(android.content.Intent.EXTRA_TEXT, text)
    }
    context.startActivity(android.content.Intent.createChooser(send, "Share"))
}

/** Cover for a meal without a photo: the calories big, the food and macros under it. */
@Composable
fun MealCover(post: FeedPost, modifier: Modifier = Modifier) {
    Box(
        modifier.background(
            androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF1C3A3A), Color(0xFF101820), Color(0xFF2A2420))),
        ),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(28.dp)) {
            Text(post.mealType.label.uppercase(), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, letterSpacing = 2.sp)
            Text(formatKcal(post.calories), style = MaterialTheme.typography.displayLarge, fontWeight = FontWeight.Bold, color = Color.White)
            Text("kcal", style = MaterialTheme.typography.titleMedium, color = Color.White.copy(alpha = 0.7f))
            if (post.description.isNotBlank()) {
                Text(
                    post.description,
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    maxLines = 2, overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 18.dp),
                )
            }
            val macros = listOfNotNull(
                post.protein.takeIf { it > 0 }?.let { "Protein $it g" },
                post.carbs.takeIf { it > 0 }?.let { "Carbs $it g" },
                post.fat.takeIf { it > 0 }?.let { "Fat $it g" },
            )
            if (macros.isNotEmpty()) {
                Row(Modifier.padding(top = 14.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    macros.forEach {
                        Text(
                            it, style = MaterialTheme.typography.labelMedium, color = Color.White,
                            modifier = Modifier.background(Color.White.copy(alpha = 0.12f), CircleShape).padding(horizontal = 10.dp, vertical = 5.dp),
                        )
                    }
                }
            }
        }
    }
}

/** Cover for a workout: title, the three numbers that matter, and the main exercises. */
@Composable
fun WorkoutCover(w: WorkoutInfo, modifier: Modifier = Modifier) {
    val units = ProfileRepository.profile.collectAsState().value?.units ?: Units.METRIC
    Box(
        modifier.background(
            androidx.compose.ui.graphics.Brush.linearGradient(listOf(Color(0xFF15302B), Color(0xFF101820), Color(0xFF1C2934))),
        ),
    ) {
        Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("WORKOUT", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary, letterSpacing = 2.sp)
                Text(w.title, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Row(Modifier.fillMaxWidth()) {
                CoverStat(WorkoutMath.formatDuration(w.durationSec), "time", Modifier.weight(1f))
                CoverStat(WorkoutMath.formatVolume(w.volumeKg.toDouble(), units), "volume", Modifier.weight(1.3f))
                CoverStat("${w.sets}", "sets", Modifier.weight(0.7f))
                if (w.records > 0) CoverStat("${w.records}", if (w.records == 1) "record" else "records", Modifier.weight(0.9f), Apricot)
            }
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                w.exercises.take(4).forEach { line ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("${line.sets} × ${line.name}", style = MaterialTheme.typography.bodyMedium, color = Color.White, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f))
                        Text(line.best, style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.7f))
                    }
                }
                if (w.exercises.size > 4) {
                    Text("+ ${w.exercises.size - 4} more", style = MaterialTheme.typography.bodySmall, color = Color.White.copy(alpha = 0.7f))
                }
            }
        }
    }
}

@Composable
private fun CoverStat(value: String, label: String, modifier: Modifier, color: Color = Color.White) {
    Column(modifier) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color, maxLines = 1)
        Text(label, style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.7f))
    }
}

@Composable
fun MealPhoto(photo: String, modifier: Modifier = Modifier) {
    val bitmap by produceState<android.graphics.Bitmap?>(null, photo) { value = MealPhotos.decode(photo) }
    Box(modifier.background(MaterialTheme.colorScheme.surfaceContainer)) {
        bitmap?.let {
            Image(it.asImageBitmap(), contentDescription = "Meal photo", contentScale = ContentScale.Crop, modifier = Modifier.matchParentSize())
        }
    }
}

private fun timeAgo(post: FeedPost): String {
    val now = System.currentTimeMillis()
    val t = post.createdAt.time
    return if (now - t < DateUtils.MINUTE_IN_MILLIS) "Just now"
    else DateUtils.getRelativeTimeSpanString(t, now, DateUtils.MINUTE_IN_MILLIS).toString()
}
