package com.ascendlab.app.ui.screens.home

import android.text.format.DateUtils
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.ascendlab.app.data.Comment
import com.ascendlab.app.data.MealPhotos
import com.ascendlab.app.data.PersonStats
import com.ascendlab.app.data.ProfileRepository
import com.ascendlab.app.data.SocialRepository
import com.ascendlab.app.data.StatsRepository
import com.ascendlab.app.data.Units
import com.ascendlab.app.data.Convert
import com.ascendlab.app.ui.components.Avatar
import com.ascendlab.app.ui.components.ChartSeries
import com.ascendlab.app.ui.components.Gutter
import com.ascendlab.app.ui.components.Hairline
import com.ascendlab.app.ui.components.MealPhoto
import com.ascendlab.app.ui.components.MultiLineChart
import com.ascendlab.app.ui.components.PageHeader
import com.ascendlab.app.ui.components.PostCard
import com.ascendlab.app.ui.components.SectionTitle
import com.ascendlab.app.ui.components.SkeletonCard
import com.ascendlab.app.ui.components.formatKcal
import com.ascendlab.app.ui.components.rememberHaptics
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

// ---------------------------------------------------------------- Comments

@Composable
fun CommentsScreen(navController: NavHostController, postId: String, vm: FeedViewModel = viewModel()) {
    val feed by vm.feed.collectAsStateWithLifecycle()
    val me by vm.me.collectAsState()
    val myUid = me?.uid ?: SocialRepository.uid
    val direct by remember(postId) { SocialRepository.post(postId) }.collectAsStateWithLifecycle(initialValue = null)
    val post = direct ?: feed.posts.firstOrNull { it.id == postId }
    val comments by remember(postId) { SocialRepository.comments(postId) }.collectAsStateWithLifecycle(initialValue = null)
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val haptics = rememberHaptics()
    val listState = rememberLazyListState()
    var text by remember { mutableStateOf("") }
    var photo by remember { mutableStateOf<String?>(null) }
    var preparing by remember { mutableStateOf(false) }
    var sending by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }

    val pick = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            preparing = true
            scope.launch { photo = MealPhotos.encode(context, uri); preparing = false }
        }
    }
    // Keep the newest comment in view when one arrives.
    LaunchedEffect(comments?.size) { comments?.let { if (it.isNotEmpty()) listState.animateScrollToItem(it.size) } }

    Column(Modifier.fillMaxSize().imePadding()) {
        PageHeader("Comments", onBack = { navController.popBackStack() })
        LazyColumn(Modifier.weight(1f), state = listState, contentPadding = PaddingValues(bottom = 12.dp)) {
            item {
                if (post != null) {
                    PostCard(post, myUid, onLike = { SocialRepository.toggleLike(post) }, onDelete = {
                        SocialRepository.deletePost(post); navController.popBackStack()
                    })
                    Hairline(Modifier.padding(top = 8.dp))
                } else if (feed.loading) {
                    SkeletonCard()
                }
            }
            val list = comments
            if (list == null) {
                item { SkeletonCard() }
            } else if (list.isEmpty()) {
                item {
                    Text(
                        "No comments yet. Say something nice.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = Gutter, vertical = 20.dp),
                    )
                }
            }
            items(list.orEmpty(), key = { it.id }) { c ->
                CommentRow(
                    c,
                    isMine = c.uid == myUid,
                    canDelete = c.uid == myUid || post?.uid == myUid,
                    onDelete = { post?.let { SocialRepository.deleteComment(it, c) } },
                    modifier = Modifier.animateItem(),
                )
            }
        }

        Hairline()
        photo?.let { p ->
            Box(Modifier.padding(start = Gutter, top = 10.dp)) {
                MealPhoto(p, Modifier.size(72.dp).clip(RoundedCornerShape(10.dp)))
                IconButton(
                    onClick = { photo = null },
                    modifier = Modifier.align(Alignment.TopEnd).size(28.dp)
                        .background(MaterialTheme.colorScheme.background.copy(alpha = 0.8f), CircleShape),
                ) { Icon(Icons.Filled.Close, "Remove photo", modifier = Modifier.size(16.dp)) }
            }
        }
        error?.let { Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(horizontal = Gutter)) }
        Row(Modifier.fillMaxWidth().padding(start = 8.dp, end = 8.dp, top = 4.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = {
                pick.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
            }, enabled = !preparing && post != null) {
                if (preparing) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
                else Icon(Icons.Filled.Image, "Add a photo", tint = MaterialTheme.colorScheme.primary)
            }
            TextField(
                value = text,
                onValueChange = { text = it.take(500); error = null },
                placeholder = { Text("Add a comment…") },
                modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                shape = RoundedCornerShape(24.dp),
                maxLines = 4,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
                colors = TextFieldDefaults.colors(
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent,
                    focusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                    unfocusedContainerColor = MaterialTheme.colorScheme.surfaceContainer,
                ),
            )
            val canSend = post != null && !sending && !preparing && (text.isNotBlank() || photo != null)
            IconButton(
                onClick = {
                    val target = post ?: return@IconButton
                    sending = true
                    scope.launch {
                        val failure = SocialRepository.addComment(target, text, photo)
                        sending = false
                        if (failure == null) { haptics.confirm(); text = ""; photo = null } else { haptics.reject(); error = failure }
                    }
                },
                enabled = canSend,
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.Send, "Send",
                    tint = if (canSend) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun CommentRow(c: Comment, isMine: Boolean, canDelete: Boolean, onDelete: () -> Unit, modifier: Modifier = Modifier) {
    var menu by remember { mutableStateOf(false) }
    Row(modifier.fillMaxWidth().padding(start = Gutter, end = 4.dp, top = 10.dp, bottom = 10.dp)) {
        Avatar(c.authorName, c.uid, size = 32)
        Column(Modifier.weight(1f).padding(start = 12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Text(
                buildAnnotatedString {
                    withStyle(SpanStyle(fontWeight = FontWeight.SemiBold)) { append(if (isMine) "You" else c.authorName) }
                    withStyle(SpanStyle(color = MaterialTheme.colorScheme.onSurfaceVariant)) {
                        val now = System.currentTimeMillis()
                        append(
                            "  " + if (now - c.createdAt.time < DateUtils.MINUTE_IN_MILLIS) "just now"
                            else DateUtils.getRelativeTimeSpanString(c.createdAt.time, now, DateUtils.MINUTE_IN_MILLIS, DateUtils.FORMAT_ABBREV_RELATIVE),
                        )
                    }
                },
                style = MaterialTheme.typography.bodySmall,
            )
            if (c.text.isNotBlank()) Text(c.text, style = MaterialTheme.typography.bodyMedium)
            c.photo?.let { MealPhoto(it, Modifier.size(180.dp).clip(RoundedCornerShape(12.dp))) }
        }
        if (canDelete) {
            Box {
                IconButton(onClick = { menu = true }, modifier = Modifier.size(36.dp)) {
                    Icon(Icons.Filled.Close, "Comment options", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(16.dp))
                }
                DropdownMenu(expanded = menu, onDismissRequest = { menu = false }) {
                    DropdownMenuItem(text = { Text("Delete comment") }, onClick = { menu = false; onDelete() })
                }
            }
        }
    }
}

// ---------------------------------------------------------------- Compare with friends

/** Fixed order, validated for colour-blind separation: you first, then friends in friend-list order. */
private val personColors = listOf(
    Color(0xFF199E70), // you
    Color(0xFFD95926),
    Color(0xFF3987E5),
    Color(0xFFC98500),
    Color(0xFFD55181),
)
private const val MAX_FRIENDS_SHOWN = 4
private const val DAYS = 30

@Composable
fun CompareScreen(navController: NavHostController) {
    val me by SocialRepository.me.collectAsState()
    val units = ProfileRepository.profile.collectAsState().value?.units ?: Units.METRIC
    val scope = rememberCoroutineScope()
    var stats by remember { mutableStateOf<List<PersonStats>?>(null) }
    var shareWeight by remember { mutableStateOf(StatsRepository.sharesWeight) }
    var reload by remember { mutableStateOf(0) }

    LaunchedEffect(reload) {
        runCatching { StatsRepository.syncMine() }
        shareWeight = StatsRepository.sharesWeight
        val self = SocialRepository.refreshMe()
        val friends = runCatching { SocialRepository.friendProfiles() }.getOrDefault(emptyList())
        val people = listOfNotNull(self?.let { it.uid to "You" }) + friends.map { it.uid to it.name }
        // Friends with the most logged days first, so the chart shows the ones you can compare with.
        val loaded = StatsRepository.load(people)
        stats = loaded.take(1) + loaded.drop(1).sortedByDescending { it.kcal.size }.take(MAX_FRIENDS_SHOWN)
    }

    val dayMs = 24L * 3600 * 1000
    val now = System.currentTimeMillis()
    val start = now - DAYS * dayMs
    // Calories stop at yesterday: today isn't finished, and a half day would look like a crash.
    val end = now
    val todayKey = com.ascendlab.app.data.Days.key()
    val inRange = { key: String -> runCatching { SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(key)!!.time }.getOrNull()?.takeIf { it in start..end } }
    val fmt = remember { SimpleDateFormat("EEE d MMM", Locale.getDefault()) }

    Column(Modifier.fillMaxSize()) {
        PageHeader("You vs friends", onBack = { navController.popBackStack() })
        val list = stats
        if (list == null) {
            SkeletonCard()
        } else LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
            if (list.size <= 1) {
                item {
                    Text(
                        "Add friends to compare. Until then, here's just you.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = Gutter, vertical = 8.dp),
                    )
                }
            }

            // Calories eaten per day.
            val kcalSeries = list.mapIndexed { i, p ->
                ChartSeries(
                    p.name, personColors[i],
                    p.kcal.filterKeys { it != todayKey }.mapNotNull { (k, v) -> inRange(k)?.let { it + dayMs / 2 to v.toDouble() } }.filter { it.second > 0 },
                )
            }
            item { SectionTitle("Calories eaten per day") }
            item {
                Box(Modifier.padding(horizontal = Gutter)) {
                    MultiLineChart(
                        series = kcalSeries,
                        startMs = start, endMs = end,
                        valueLabel = { "${formatKcal(it.roundToInt())} kcal" },
                        dayLabel = { fmt.format(Date(it)) },
                    )
                }
            }
            item {
                Text(
                    "Last 30 days, today not included. Daily average: " + kcalSeries.filter { it.points.isNotEmpty() }.joinToString("  ·  ") { s ->
                        "${s.name} ${formatKcal(s.points.map { it.second }.average().roundToInt())}"
                    }.ifEmpty { "no meals logged yet" },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Gutter, vertical = 10.dp),
                )
                Hairline(Modifier.padding(top = 8.dp))
            }

            // Weight change since each person's first weigh-in in the period: fair across body sizes.
            val weightSeries = list.mapIndexedNotNull { i, p ->
                val pts = p.weights.mapNotNull { (k, v) -> inRange(k)?.let { it + dayMs / 2 to v } }.sortedBy { it.first }
                if (pts.isEmpty()) null
                else {
                    val base = pts.first().second
                    ChartSeries(p.name, personColors[i], pts.map { (t, kg) -> t to toUnit(kg - base, units) })
                }
            }
            item { SectionTitle("Weight change") }
            item {
                if (weightSeries.isEmpty()) {
                    Text("No weigh-ins in the last 30 days.", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(horizontal = Gutter))
                } else Box(Modifier.padding(horizontal = Gutter)) {
                    MultiLineChart(
                        series = weightSeries,
                        startMs = start, endMs = end,
                        valueLabel = { v -> signed(v) + " ${units.weightUnit}" },
                        dayLabel = { fmt.format(Date(it)) },
                        zeroLine = true,
                        carryForward = true,
                    )
                }
            }
            item {
                Text(
                    "Shown as change from each person's first weigh-in, so different body sizes compare fairly. Only friends who share their weight appear.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = Gutter, vertical = 10.dp),
                )
            }
            item {
                Row(Modifier.fillMaxWidth().padding(horizontal = Gutter, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Share my weight with friends", style = MaterialTheme.typography.bodyLarge)
                        Text("Friends see how your weight changes over time", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.width(12.dp))
                    Switch(checked = shareWeight, onCheckedChange = { on ->
                        shareWeight = on
                        scope.launch { runCatching { StatsRepository.setShareWeight(on) }; reload++ }
                    })
                }
            }
        }
    }
}

private fun toUnit(kg: Double, units: Units) = if (units == Units.IMPERIAL) Convert.kgToLb(kg) else kg

private fun signed(v: Double): String {
    val r = (v * 10).roundToInt() / 10.0
    return when {
        abs(r) < 0.05 -> "0"
        r > 0 -> "+$r"
        else -> "−${abs(r)}"
    }
}
