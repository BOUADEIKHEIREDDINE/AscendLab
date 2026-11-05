package com.ascendlab.app.ui.components

import androidx.compose.ui.draw.clip
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.RoundRect
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlin.math.abs

/**
 * Column chart for a handful of values (e.g. workouts per week). Bars grow from one
 * baseline with rounded tops; tapping a bar shows its value above the chart.
 */
@Composable
fun BarChart(
    values: List<Int>,
    labels: List<String>,
    valueLabel: (Int, Int) -> String,
    modifier: Modifier = Modifier,
) {
    var selected by remember(values) { mutableStateOf(values.lastIndex) }
    val grow = remember { Animatable(0f) }
    LaunchedEffect(values) { grow.snapTo(0f); grow.animateTo(1f, tween(700, easing = FastOutSlowInEasing)) }
    val bar = MaterialTheme.colorScheme.primary
    val dim = MaterialTheme.colorScheme.primary.copy(alpha = 0.45f)
    val grid = MaterialTheme.colorScheme.outlineVariant
    val max = (values.maxOrNull() ?: 0).coerceAtLeast(1)
    val haptics = rememberHaptics()

    Column(modifier) {
        Text(
            if (selected in values.indices) valueLabel(selected, values[selected]) else "",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface,
        )
        Canvas(
            Modifier.fillMaxWidth().height(120.dp)
                .semantics { contentDescription = labels.zip(values).joinToString { (l, v) -> "$l: $v" } }
                .pointerInput(values) {
                    detectTapGestures { pos ->
                        val slot = size.width / values.size.coerceAtLeast(1)
                        val i = (pos.x / slot).toInt().coerceIn(0, values.lastIndex)
                        if (i != selected) haptics.tick()
                        selected = i
                    }
                },
        ) {
            val slot = size.width / values.size.coerceAtLeast(1)
            val barWidth = minOf(24.dp.toPx(), slot * 0.6f)
            val baseline = size.height - 1.dp.toPx()
            drawLine(grid, Offset(0f, baseline), Offset(size.width, baseline), strokeWidth = 1.dp.toPx())
            values.forEachIndexed { i, v ->
                val h = (v.toFloat() / max) * (size.height - 8.dp.toPx()) * grow.value
                if (h <= 0f) return@forEachIndexed
                val left = slot * i + (slot - barWidth) / 2
                val r = 4.dp.toPx()
                // Rounded data end, square at the baseline.
                val path = Path().apply {
                    addRoundRect(
                        RoundRect(
                            left = left, top = baseline - h, right = left + barWidth, bottom = baseline,
                            topLeftCornerRadius = CornerRadius(r), topRightCornerRadius = CornerRadius(r),
                            bottomLeftCornerRadius = CornerRadius.Zero, bottomRightCornerRadius = CornerRadius.Zero,
                        ),
                    )
                }
                drawPath(path, if (i == selected) bar else dim)
            }
        }
        Row(Modifier.fillMaxWidth()) {
            labels.forEach {
                Text(
                    it, style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center, modifier = Modifier.weight(1f),
                )
            }
        }
    }
}

/** Line chart for a value over time (e.g. body weight). Tap anywhere to read the nearest point. */
@Composable
fun LineChart(
    points: List<Pair<Long, Double>>,
    pointLabel: (Pair<Long, Double>) -> String,
    modifier: Modifier = Modifier,
) {
    var selected by remember(points) { mutableStateOf(points.lastIndex) }
    val reveal = remember { Animatable(0f) }
    LaunchedEffect(points) { reveal.snapTo(0f); reveal.animateTo(1f, tween(900, easing = FastOutSlowInEasing)) }
    val line = MaterialTheme.colorScheme.primary
    val surface = MaterialTheme.colorScheme.surfaceContainer
    val grid = MaterialTheme.colorScheme.outlineVariant
    val haptics = rememberHaptics()

    Column(modifier) {
        Text(
            points.getOrNull(selected)?.let(pointLabel).orEmpty(),
            style = MaterialTheme.typography.bodyMedium,
        )
        Canvas(
            Modifier.fillMaxWidth().height(110.dp)
                .semantics { contentDescription = "Weight over time, ${points.size} entries" }
                .pointerInput(points) {
                    detectTapGestures { pos ->
                        val xs = xPositions(points, size.width.toFloat())
                        val i = xs.indices.minByOrNull { abs(xs[it] - pos.x) } ?: return@detectTapGestures
                        if (i != selected) haptics.tick()
                        selected = i
                    }
                },
        ) {
            if (points.isEmpty()) return@Canvas
            val pad = 6.dp.toPx()
            val minV = points.minOf { it.second }
            val maxV = points.maxOf { it.second }
            val span = (maxV - minV).takeIf { it > 0.5 } ?: 1.0
            val xs = xPositions(points, size.width)
            fun y(v: Double) = (pad + (1 - (v - minV) / span) * (size.height - 2 * pad)).toFloat()

            listOf(0f, 0.5f, 1f).forEach { f ->
                val gy = pad + f * (size.height - 2 * pad)
                drawLine(grid, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1.dp.toPx())
            }
            val path = Path()
            points.forEachIndexed { i, p -> if (i == 0) path.moveTo(xs[i], y(p.second)) else path.lineTo(xs[i], y(p.second)) }
            clipRectReveal(reveal.value) {
                drawPath(path, line, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
            }
            points.getOrNull(selected)?.let { p ->
                val c = Offset(xs[selected], y(p.second))
                drawCircle(surface, radius = 6.dp.toPx(), center = c)
                drawCircle(line, radius = 4.dp.toPx(), center = c)
            }
        }
    }
}

private fun xPositions(points: List<Pair<Long, Double>>, width: Float): List<Float> {
    if (points.size == 1) return listOf(width / 2)
    val pad = 8f
    val first = points.first().first
    val span = (points.last().first - first).coerceAtLeast(1L).toFloat()
    return points.map { pad + (it.first - first) / span * (width - 2 * pad) }
}

private inline fun androidx.compose.ui.graphics.drawscope.DrawScope.clipRectReveal(
    fraction: Float,
    block: androidx.compose.ui.graphics.drawscope.DrawScope.() -> Unit,
) {
    drawContext.canvas.save()
    drawContext.canvas.clipRect(0f, 0f, size.width * fraction, size.height)
    block()
    drawContext.canvas.restore()
}

/** One line in a [MultiLineChart]: whose it is, its colour, and (x, y) points. */
data class ChartSeries(val name: String, val color: androidx.compose.ui.graphics.Color, val points: List<Pair<Long, Double>>)

/**
 * Several people's lines on one chart (e.g. you and your friends). Tap anywhere to put a
 * crosshair on the nearest day: the legend underneath then shows each person's value there.
 * Days with no data simply have no point; the line joins the days that do.
 */
@Composable
fun MultiLineChart(
    series: List<ChartSeries>,
    startMs: Long,
    endMs: Long,
    valueLabel: (Double) -> String,
    dayLabel: (Long) -> String,
    modifier: Modifier = Modifier,
    zeroLine: Boolean = false,
    /** For slow-moving values (weight): a day without data shows the latest earlier value. */
    carryForward: Boolean = false,
) {
    val dayMs = 24L * 3600 * 1000
    var selectedDay by remember(series) { mutableStateOf<Long?>(null) }
    val reveal = remember { Animatable(0f) }
    LaunchedEffect(series) { reveal.snapTo(0f); reveal.animateTo(1f, tween(900, easing = FastOutSlowInEasing)) }
    val grid = MaterialTheme.colorScheme.outlineVariant
    val surface = MaterialTheme.colorScheme.background
    val cross = MaterialTheme.colorScheme.onSurfaceVariant
    val haptics = rememberHaptics()
    val all = series.flatMap { it.points.map { p -> p.second } }
    val minV = (all.minOrNull() ?: 0.0).let { if (zeroLine) minOf(it, 0.0) else it }
    val maxV = (all.maxOrNull() ?: 1.0).let { if (zeroLine) maxOf(it, 0.0) else it }
    val span = (maxV - minV).takeIf { it > 0.0001 } ?: 1.0

    fun dayOf(t: Long) = t / dayMs

    Column(modifier) {
        Row(Modifier.fillMaxWidth()) {
            Text(valueLabel(maxV), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.weight(1f))
            selectedDay?.let {
                Text(dayLabel(it * dayMs), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurface)
            }
        }
        Canvas(
            Modifier.fillMaxWidth().height(170.dp)
                .semantics { contentDescription = series.joinToString { "${it.name}: ${it.points.size} days" } }
                .pointerInput(series) {
                    detectTapGestures { pos ->
                        val frac = (pos.x / size.width).coerceIn(0f, 1f)
                        val t = startMs + ((endMs - startMs) * frac).toLong()
                        val d = dayOf(t)
                        if (d != selectedDay) haptics.tick()
                        selectedDay = d
                    }
                },
        ) {
            val pad = 6.dp.toPx()
            fun x(t: Long) = ((t - startMs).toFloat() / (endMs - startMs).coerceAtLeast(1)) * size.width
            fun y(v: Double) = (pad + (1 - (v - minV) / span) * (size.height - 2 * pad)).toFloat()
            listOf(0f, 0.5f, 1f).forEach { f ->
                val gy = pad + f * (size.height - 2 * pad)
                drawLine(grid, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1.dp.toPx())
            }
            if (zeroLine && minV < 0 && maxV > 0) {
                drawLine(cross, Offset(0f, y(0.0)), Offset(size.width, y(0.0)), strokeWidth = 1.dp.toPx())
            }
            selectedDay?.let { d ->
                val cx = x(d * dayMs + dayMs / 2)
                drawLine(cross, Offset(cx, 0f), Offset(cx, size.height), strokeWidth = 1.dp.toPx())
            }
            clipRectReveal(reveal.value) {
                series.forEach { s ->
                    val pts = s.points.sortedBy { it.first }
                    if (pts.size == 1) {
                        drawCircle(s.color, radius = 4.dp.toPx(), center = Offset(x(pts[0].first), y(pts[0].second)))
                    } else if (pts.size > 1) {
                        val path = Path()
                        pts.forEachIndexed { i, p -> if (i == 0) path.moveTo(x(p.first), y(p.second)) else path.lineTo(x(p.first), y(p.second)) }
                        drawPath(path, s.color, style = Stroke(width = 2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
                    }
                }
            }
            // Markers on the selected day, ringed with the surface colour so overlaps stay readable.
            selectedDay?.let { d ->
                series.forEach { s ->
                    s.points.firstOrNull { dayOf(it.first) == d }?.let { p ->
                        val c = Offset(x(p.first), y(p.second))
                        drawCircle(surface, radius = 6.dp.toPx(), center = c)
                        drawCircle(s.color, radius = 4.dp.toPx(), center = c)
                    }
                }
            }
        }
        Text(valueLabel(minV), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        // Legend: always present for 2+ series; shows each value on the selected day.
        Column(Modifier.padding(top = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            series.forEach { s ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    androidx.compose.foundation.layout.Box(
                        Modifier.size(10.dp).clip(androidx.compose.foundation.shape.CircleShape)
                            .background(s.color),
                    )
                    Text(s.name, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f).padding(start = 10.dp))
                    val v = selectedDay?.let { d ->
                        s.points.firstOrNull { dayOf(it.first) == d }?.second
                            ?: if (carryForward) s.points.filter { dayOf(it.first) <= d }.maxByOrNull { it.first }?.second else null
                    }
                    Text(
                        when {
                            selectedDay == null -> ""
                            v == null -> "–"
                            else -> valueLabel(v)
                        },
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }
    }
}
