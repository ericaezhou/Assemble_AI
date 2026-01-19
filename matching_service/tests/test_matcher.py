from matcher import match_profiles


def test_match_profiles_returns_sorted_scores():
    user = {
        "id": 1,
        "institution": "Stanford",
        "research_areas": "vision, robotics",
        "interests": "perception, reinforcement learning",
        "bio": "Working on embodied agents."
    }

    candidates = [
        {
            "id": 2,
            "institution": "MIT",
            "research_areas": "robotics, control",
            "interests": "reinforcement learning",
            "bio": (
                "Robotics and control systems for mobile manipulation, with "
                "a focus on safe exploration and sample-efficient learning."
            )
        },
        {
            "id": 3,
            "institution": "Berkeley",
            "research_areas": "systems",
            "interests": "databases",
            "bio": (
                "Distributed systems research covering storage engines, "
                "consistency models, and performance debugging at scale."
            )
        },
        {
            "id": 4,
            "institution": "CMU",
            "research_areas": "vision, perception",
            "interests": "robotics",
            "bio": (
                "Perception for robots with emphasis on multi-view geometry, "
                "sensor fusion, and robust localization in the wild."
            )
        },
        {
            "id": 5,
            "institution": "清华大学",
            "research_areas": "计算机视觉, 机器人",
            "interests": "三维重建, 视觉定位",
            "bio": (
                "研究方向为三维视觉与机器人感知，关注在复杂环境下的鲁棒定位、"
                "跨域泛化以及多模态传感融合。"
            )
        },
        {
            "id": 6,
            "institution": "北京大学",
            "research_areas": "自然语言处理, 信息检索",
            "interests": "大模型, 语义匹配",
            "bio": (
                "主要研究文本表示学习与多语言检索，探索在低资源语言上的迁移学习"
                "与语义对齐方法。"
            )
        }
    ]

    matches = match_profiles(user, candidates, k=2)

    assert len(matches) == 2
    assert matches[0]["score"] >= matches[1]["score"]
    assert {match["id"] for match in matches}.issubset({2, 3, 4, 5, 6})
    assert all("institution" in match for match in matches)
    assert all("research_areas" in match for match in matches)
    assert all("interests" in match for match in matches)
    assert all("bio" in match for match in matches)


def test_match_profiles_caps_at_candidate_count():
    user = {
        "id": 1,
        "institution": "Stanford",
        "research_areas": "vision, robotics",
        "interests": "perception, reinforcement learning",
        "bio": "Working on embodied agents."
    }

    candidates = [
        {
            "id": 2,
            "institution": "MIT",
            "research_areas": "robotics, control",
            "interests": "reinforcement learning",
            "bio": (
                "Robotics and control systems for mobile manipulation, with "
                "a focus on safe exploration and sample-efficient learning."
            )
        },
        {
            "id": 3,
            "institution": "Berkeley",
            "research_areas": "systems",
            "interests": "databases",
            "bio": (
                "Distributed systems research covering storage engines, "
                "consistency models, and performance debugging at scale."
            )
        },
        {
            "id": 4,
            "institution": "CMU",
            "research_areas": "vision, perception",
            "interests": "robotics",
            "bio": (
                "Perception for robots with emphasis on multi-view geometry, "
                "sensor fusion, and robust localization in the wild."
            )
        },
        {
            "id": 5,
            "institution": "清华大学",
            "research_areas": "计算机视觉, 机器人",
            "interests": "三维重建, 视觉定位",
            "bio": (
                "研究方向为三维视觉与机器人感知，关注在复杂环境下的鲁棒定位、"
                "跨域泛化以及多模态传感融合。"
            )
        },
        {
            "id": 6,
            "institution": "北京大学",
            "research_areas": "自然语言处理, 信息检索",
            "interests": "大模型, 语义匹配",
            "bio": (
                "主要研究文本表示学习与多语言检索，探索在低资源语言上的迁移学习"
                "与语义对齐方法。"
            )
        }
    ]

    matches = match_profiles(user, candidates, k=10)

    assert len(matches) == len(candidates)
    assert {match["id"] for match in matches} == {2, 3, 4, 5, 6}
    assert all("institution" in match for match in matches)
