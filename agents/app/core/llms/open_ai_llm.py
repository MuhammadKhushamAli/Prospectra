from typing import TypeVar, cast

from openai import OpenAI
from pydantic import BaseModel


StructuredOutput = TypeVar("StructuredOutput", bound=BaseModel)


def parse_structured_response(
    client: OpenAI,
    model_name: str,
    input: str,
    system_prompt: str,
    pydantic_model: type[StructuredOutput],
) -> StructuredOutput:
    """Return structured output parsed by the OpenAI Responses API."""
    response = client.responses.parse(
        model=model_name,
        input=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": input},
        ],
        text_format=pydantic_model,
    )
    return cast(StructuredOutput, response.output_parsed)
