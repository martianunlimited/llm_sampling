"""Typer CLI interface for LLM Sampling & Decoding Playground."""

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from src.core.preset_data import get_all_presets, get_preset_by_id
from src.core.sampling_service import SamplingService
from src.schemas import SamplingParameters

app = typer.Typer(
    name="sampling-cli",
    help="Interactive CLI tool for exploring LLM Next-Token Sampling and Decoding strategies.",
)
console = Console()


@app.command()
def sample(
    preset: str = typer.Option("factual-paris", "--preset", "-p", help="Preset ID to sample from"),
    temperature: float = typer.Option(
        0.8, "--temp", "-t", help="Softmax temperature (0.01 to 5.0)"
    ),
    top_k: int = typer.Option(10, "--top-k", "-k", help="Top-K cutoff (0 for disabled)"),
    top_p: float = typer.Option(0.90, "--top-p", help="Top-P nucleus threshold (0.0 to 1.0)"),
    rep_penalty: float = typer.Option(
        1.0, "--rep-pen", "-r", help="Repetition penalty (1.0 to 5.0)"
    ),
) -> None:
    """Compute candidate token distribution and simulate sampling."""
    preset_obj = get_preset_by_id(preset)
    if not preset_obj:
        console.print(f"[red]Error: Preset '{preset}' not found.[/red]")
        raise typer.Exit(code=1)

    params = SamplingParameters(
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        repetition_penalty=rep_penalty,
    )

    service = SamplingService()
    result = service.process_distribution(preset_obj.prompt, preset_obj.candidates, params)
    sampled = service.sample_token(result.candidates)

    console.print(
        Panel.fit(
            f"[bold cyan]Prompt:[/bold cyan] {result.prompt}\n"
            f"[bold]Parameters:[/bold] Temp={params.temperature:.2f} | "
            f"Top-K={params.top_k} | Top-P={params.top_p:.2f} | "
            f"RepPenalty={params.repetition_penalty:.2f}\n"
            f"[bold]Entropy:[/bold] {result.entropy:.3f} bits | "
            f"[bold green]Argmax:[/bold green] '{result.argmax_token}' | "
            f"[bold magenta]Sampled Roll:[/bold magenta] '{sampled}'",
            title="🎲 LLM Next-Token Distribution",
            border_style="cyan",
        )
    )

    table = Table(title="Candidate Tokens & Filter Cutoffs", show_header=True)
    table.add_column("Rank", justify="right", style="dim")
    table.add_column("Token", style="bold")
    table.add_column("Raw Logit", justify="right")
    table.add_column("Penalized", justify="right")
    table.add_column("Raw Prob", justify="right")
    table.add_column("Status / Filter", justify="center")
    table.add_column("Final Prob", justify="right", style="bold green")
    table.add_column("Cum Sum", justify="right", style="dim")

    for idx, c in enumerate(result.candidates, 1):
        status = (
            f"[red]FILTERED ({c.filter_reason})[/red]" if c.filtered else "[green]ACTIVE[/green]"
        )
        final_str = f"{c.final_prob * 100:.2f}%" if not c.filtered else "[dim]-[/dim]"
        cum_str = f"{c.cumulative_prob * 100:.1f}%" if not c.filtered else "[dim]-[/dim]"

        table.add_row(
            str(idx),
            f"'{c.token}'",
            f"{c.raw_logit:.1f}",
            f"{c.penalized_logit:.1f}",
            f"{c.raw_prob * 100:.2f}%",
            status,
            final_str,
            cum_str,
        )

    console.print(table)


@app.command()
def presets() -> None:
    """List all available educational presets."""
    all_presets = get_all_presets()
    table = Table(title="📚 Educational Sampling Presets", show_header=True)
    table.add_column("ID", style="cyan")
    table.add_column("Title", style="bold")
    table.add_column("Category", style="magenta")
    table.add_column("Recommended Settings", style="dim")

    for p in all_presets:
        rec = f"T={p.recommended_temp}, K={p.recommended_top_k}, P={p.recommended_top_p}"
        table.add_row(p.id, p.title, p.category, rec)

    console.print(table)


@app.command()
def inspect(preset_id: str = typer.Argument(..., help="Preset ID to inspect")) -> None:
    """Inspect a preset scenario with in-depth decoding explanation."""
    preset = get_preset_by_id(preset_id)
    if not preset:
        console.print(f"[red]Error: Preset '{preset_id}' not found.[/red]")
        raise typer.Exit(code=1)

    console.print(
        Panel(
            f"[bold cyan]Title:[/bold cyan] {preset.title}\n"
            f"[bold magenta]Category:[/bold magenta] {preset.category}\n"
            f"[bold]Prompt:[/bold] {preset.prompt}\n\n"
            f"[bold green]Educational Insight:[/bold green]\n{preset.explanation}\n\n"
            f"[bold]Recommended Defaults:[/bold] Temp={preset.recommended_temp}, "
            f"Top-K={preset.recommended_top_k}, Top-P={preset.recommended_top_p}, "
            f"RepPenalty={preset.recommended_rep_pen}",
            title=f"Scenario: {preset.id}",
            border_style="green",
        )
    )


@app.command()
def beam_search(
    prompt: str = typer.Option("The capital of France is", "--prompt", "-p"),
    width: int = typer.Option(3, "--width", "-w", help="Beam width B"),
) -> None:
    """Simulate Beam Search sequence decoding."""
    service = SamplingService()
    beams = service.simulate_beam_search(prompt=prompt, beam_width=width, max_steps=2)

    table = Table(title=f"Beam Search Hypotheses (Width = {width})", show_header=True)
    table.add_column("Rank", justify="center", style="dim")
    table.add_column("Hypothesis Sequence", style="bold cyan")
    table.add_column("Log Prob", justify="right")
    table.add_column("Normalized Score", justify="right", style="bold green")

    for i, b in enumerate(beams, 1):
        table.add_row(str(i), b.text, f"{b.cumulative_log_prob:.3f}", f"{b.score:.4f}")

    console.print(table)


@app.command()
def generate(
    preset: str = typer.Option(
        "factual-paris", "--preset", "-p", help="Preset ID to generate from"
    ),
    steps: int = typer.Option(5, "--steps", "-s", help="Number of tokens to generate"),
    temperature: float = typer.Option(0.7, "--temp", "-t", help="Softmax temperature"),
    top_k: int = typer.Option(10, "--top-k", "-k", help="Top-K cutoff"),
    top_p: float = typer.Option(0.90, "--top-p", help="Top-P nucleus threshold"),
    rep_penalty: float = typer.Option(1.0, "--rep-pen", "-r", help="Repetition penalty"),
) -> None:
    """Autoregressively generate multi-token text, recalculating probabilities on every step."""
    preset_obj = get_preset_by_id(preset)
    if not preset_obj:
        console.print(f"[red]Error: Preset '{preset}' not found.[/red]")
        raise typer.Exit(code=1)

    params = SamplingParameters(
        temperature=temperature,
        top_k=top_k,
        top_p=top_p,
        repetition_penalty=rep_penalty,
    )

    service = SamplingService()
    seq, history = service.generate_sequence(preset_id=preset, steps=steps, params=params)

    console.print(
        Panel.fit(
            f"[bold cyan]Prompt:[/bold cyan] {preset_obj.prompt}\n"
            f"[bold green]Generated:[/bold green] {seq}\n"
            f"[bold]Parameters:[/bold] Temp={params.temperature:.2f} | "
            f"Top-K={params.top_k} | Top-P={params.top_p:.2f} | "
            f"RepPen={params.repetition_penalty:.2f}",
            title="⚡ Multi-Token Generation",
            border_style="green",
        )
    )

    table = Table(title="Step-by-Step Probability Recalculation", show_header=True)
    table.add_column("Step", justify="center", style="dim")
    table.add_column("Sampled Token", style="bold cyan")
    table.add_column("Entropy", justify="right")
    table.add_column("Top Candidates for Step", style="dim")

    for step_num, (tok, dist) in enumerate(history, 1):
        top_cands = ", ".join(
            f"'{c.token}' ({c.final_prob * 100:.1f}%)"
            for c in dist.candidates[:3]
            if not c.filtered
        )
        table.add_row(str(step_num), f"'{tok}'", f"{dist.entropy:.2f} bits", top_cands)

    console.print(table)


if __name__ == "__main__":
    app()
