from typing import TypeVar, cast

from openai import (
    APIConnectionError,
    APITimeoutError,
    InternalServerError,
    OpenAI,
    RateLimitError,
)
from pydantic import BaseModel
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random_exponential


StructuredOutput = TypeVar("StructuredOutput", bound=BaseModel)


@retry(
    retry=retry_if_exception_type(
        (APIConnectionError, APITimeoutError, InternalServerError, RateLimitError)
    ),
    wait=wait_random_exponential(min=1, max=60),
    stop=stop_after_attempt(3),
    reraise=True,
)
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
