import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from matcher import match_profiles


def default_payload():
    return {
        "user": {
            "id": 1,
            "institution": "Stanford",
            "research_areas": "vision, robotics",
            "interests": "perception, reinforcement learning",
            "bio": "Working on embodied agents."
        },
        "candidates": [
            {
                "id": 2,
                "institution": "MIT",
                "research_areas": "robotics, control",
                "interests": "reinforcement learning",
                "bio": "Robotics and control systems."
            },
            {
                "id": 3,
                "institution": "Berkeley",
                "research_areas": "systems",
                "interests": "databases",
                "bio": "Distributed systems research."
            },
            {
                "id": 4,
                "institution": "CMU",
                "research_areas": "vision, perception",
                "interests": "robotics",
                "bio": "Perception for robots."
            },
            {
                "id": 5,
                "institution": "UCLA",
                "research_areas": "nlp",
                "interests": "transformers, language models",
                "bio": "Large language model pretraining."
            },
            {
                "id": 6,
                "institution": "Stanford",
                "research_areas": "vision, graphics",
                "interests": "3d reconstruction",
                "bio": "Geometry and learning."
            },
            {
                "id": 7,
                "institution": "Harvard",
                "research_areas": "bioinformatics",
                "interests": "genomics, sequencing",
                "bio": "Computational biology."
            },
            {
                "id": 8,
                "institution": "Oxford",
                "research_areas": "robotics, planning",
                "interests": "motion planning",
                "bio": "Robots in the real world."
            },
            {
                "id": 9,
                "institution": "Caltech",
                "research_areas": "theory, algorithms",
                "interests": "optimization",
                "bio": "Theory and algorithms."
            },
            {
                "id": 10,
                "institution": "Georgia Tech",
                "research_areas": "hci",
                "interests": "user studies, ux",
                "bio": "Human-centered computing."
            },
            {
                "id": 11,
                "institution": "ETH Zurich",
                "research_areas": "robotics, vision",
                "interests": "perception",
                "bio": "Robotics perception systems."
            },
            {
                "id": 12,
                "institution": "清华大学",
                "research_areas": "计算机视觉, 机器人",
                "interests": "三维重建, 视觉定位",
                "bio": (
                    "研究方向为三维视觉与机器人感知，关注在复杂环境下的鲁棒定位、"
                    "跨域泛化以及多模态传感融合。"
                )
            },
            {
                "id": 13,
                "institution": "北京大学",
                "research_areas": "自然语言处理, 信息检索",
                "interests": "大模型, 语义匹配",
                "bio": (
                    "主要研究文本表示学习与多语言检索，探索在低资源语言上的迁移学习"
                    "与语义对齐方法。"
                )
            }
        ]
    }


def main():
    parser = argparse.ArgumentParser(description="Run matching with custom K.")
    parser.add_argument("--k", type=int, default=3, help="Number of matches to return.")
    parser.add_argument(
        "--input",
        type=str,
        default="",
        help="Path to JSON file with {user, candidates}."
    )
    args = parser.parse_args()

    if args.input:
        with open(args.input, "r", encoding="utf-8") as f:
            payload = json.load(f)
    else:
        payload = default_payload()

    user = payload["user"]
    candidates = payload["candidates"]
    matches = match_profiles(user, candidates, k=args.k)
    print(json.dumps({"matches": matches}, indent=2))


if __name__ == "__main__":
    main()
