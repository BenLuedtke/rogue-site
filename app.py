from flask import Flask, render_template, jsonify, request, abort
import boto3
from botocore.exceptions import ClientError
import glob
import json
import os
import random
import re
import frontmatter
import markdown

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-only-insecure-key")

LINKS = [
    {"id": "github",   "label": "GitHub",   "url": "https://github.com/benluedtke", "symbol": "G"},
    {"id": "projects", "label": "Projects", "url": "/projects", "symbol": "P"},
    {"id": "blog",     "label": "Blog",     "url": "/blog",     "symbol": "B"},
    {"id": "contact",  "label": "Contact",  "url": "/contact",  "symbol": "C"},
    {"id": "about",    "label": "About",    "url": "/about",    "symbol": "A"},
]

POSTS_DIR = os.path.join(os.path.dirname(__file__), "posts")

def _slug_from_filename(filename):
    # "2026-07-23-my-post.md" -> "my-post"
    return re.sub(r"^\d{4}-\d{2}-\d{2}-", "", filename[:-3])

def get_all_posts():
    posts = []
    for filepath in glob.glob(os.path.join(POSTS_DIR, "*.md")):
        post = frontmatter.load(filepath)
        slug = _slug_from_filename(os.path.basename(filepath))
        posts.append({
            "title": post["title"],
            "date": str(post["date"]),
            "description": post.get("description", ""),
            "slug": slug,
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts

def get_post(slug):
    for filepath in glob.glob(os.path.join(POSTS_DIR, "*.md")):
        if _slug_from_filename(os.path.basename(filepath)) == slug:
            post = frontmatter.load(filepath)
            content_html = markdown.markdown(
                post.content,
                extensions=["fenced_code", "tables", "smarty"]
            )
            return {
                "title": post["title"],
                "date": str(post["date"]),
                "description": post.get("description", ""),
                "content": content_html,
                "slug": slug,
            }
    return None

@app.route("/")
def index():
    return render_template("index.html", links=json.dumps(LINKS))

@app.route("/projects")
def projects():
    return render_template("projects.html")

@app.route("/blog")
def blog():
    return render_template("blog.html", posts=get_all_posts())

@app.route("/blog/<slug>")
def blog_post(slug):
    post = get_post(slug)
    if post is None:
        abort(404)
    return render_template("post.html", post=post)

def send_contact_email(name, reply_to, message):
    to_email = os.environ.get("TO_EMAIL")
    from_email = os.environ.get("FROM_EMAIL", to_email)
    if not to_email:
        app.logger.error("TO_EMAIL not set")
        return False
    try:
        ses = boto3.client("ses", region_name=os.environ.get("AWS_REGION", "us-east-1"))
        ses.send_email(
            Source=from_email,
            Destination={"ToAddresses": [to_email]},
            ReplyToAddresses=[reply_to],
            Message={
                "Subject": {"Data": f"Contact: {name}"},
                "Body": {"Text": {"Data": f"From: {name} <{reply_to}>\n\n{message}"}},
            },
        )
        return True
    except ClientError as e:
        app.logger.error("SES error: %s", e)
        return False

@app.route("/contact", methods=["GET", "POST"])
def contact():
    if request.method == "POST":
        name    = request.form.get("name", "").strip()
        email   = request.form.get("email", "").strip()
        message = request.form.get("message", "").strip()
        if not name or not email or not message:
            return jsonify({"ok": False, "error": "All fields are required."}), 400
        if send_contact_email(name, email, message):
            return jsonify({"ok": True})
        return jsonify({"ok": False, "error": "Failed to send. Try again later."}), 500
    return render_template("contact.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/api/dungeon")
def get_dungeon():
    seed = request.args.get("seed", random.randint(0, 999999))
    return jsonify({"seed": seed})

if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5001
    app.run(debug=True, port=port)
