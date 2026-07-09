import re


def stream_progress(process, label: str, progress_callback=None):
    """Parse percentages from CLI/tqdm-style subprocess output and log all lines."""
    percent_re = re.compile(r'(\d+)%')
    buffer = []

    def flush():
        if buffer:
            line = "".join(buffer)
            print(f"[{label}]: {line}")
            match = percent_re.search(line)
            if match and progress_callback:
                progress_callback(int(match.group(1)))
            buffer.clear()

    while True:
        char = process.stdout.read(1)
        if not char:
            flush()
            break
        if char in ('\r', '\n'):
            flush()
        else:
            buffer.append(char)
